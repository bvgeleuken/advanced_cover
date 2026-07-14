"""Pure condition evaluation engine.

No Home Assistant imports beyond constants: the engine works on a
``get_state`` callable and a :class:`CoverContext` snapshot so it can be
tested without a running core. All conditions are AND-ed; multiple states
inside one ``entity_state`` condition are OR-ed (the only OR in the model).

Fail-safe: unavailable/unknown entity states make a condition fail — the
integration never moves a cover "just in case".
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from .const import (
    COND_CONTACT,
    COND_COVER_POSITION,
    COND_ENTITY_STATE,
    COND_ENTITY_STATE_NOT,
    COND_NUMERIC_STATE,
    CONTACT_UNKNOWN,
    POSITION_OP_ABOVE,
    POSITION_OP_BELOW,
    POSITION_OP_BETWEEN,
)
from .models import Condition

# States that always count as "no usable value" (fail-safe).
_UNUSABLE_STATES = (None, "unknown", "unavailable", "")

GetState = Callable[[str], str | None]


@dataclass(frozen=True)
class CoverContext:
    """Snapshot of the assigned cover for cover-scoped conditions."""

    position: int | None = None  # current cover position 0-100, None if unknown
    contact: str = CONTACT_UNKNOWN  # resolved contact abstraction
    contact_entity_id: str | None = None  # for re-arm subscription


@dataclass
class EvaluationResult:
    """Outcome of evaluating a condition list (AND semantics)."""

    passed: bool
    failed_reasons: list[str] = field(default_factory=list)
    # External entities from *failed* conditions; a state change of any of
    # them re-evaluates the whole list while the assignment is armed.
    rearm_entity_ids: set[str] = field(default_factory=set)


def _check_entity_state(cond: Condition, get_state: GetState) -> str | None:
    """Return failure reason or ``None`` when passed."""
    if not cond.entity_id or not cond.states:
        return "invalid condition: missing entity or states"
    state = get_state(cond.entity_id)
    if state in _UNUSABLE_STATES:
        return f"{cond.entity_id} is unavailable"
    if cond.type == COND_ENTITY_STATE:
        if state in cond.states:
            return None
        return f"{cond.entity_id} is '{state}', expected one of {cond.states}"
    # entity_state_not
    if state not in cond.states:
        return None
    return f"{cond.entity_id} is '{state}', expected none of {cond.states}"


def _check_cover_position(cond: Condition, cover: CoverContext) -> str | None:
    """Return failure reason or ``None`` when passed."""
    if cover.position is None:
        return "cover position is unknown"
    pos = cover.position
    if cond.op == POSITION_OP_ABOVE:
        if cond.value is None:
            return "invalid condition: missing value"
        if pos > cond.value:
            return None
        return f"cover position {pos}% is not above {cond.value:g}%"
    if cond.op == POSITION_OP_BELOW:
        if cond.value is None:
            return "invalid condition: missing value"
        if pos < cond.value:
            return None
        return f"cover position {pos}% is not below {cond.value:g}%"
    if cond.op == POSITION_OP_BETWEEN:
        if cond.value is None or cond.value2 is None:
            return "invalid condition: missing range"
        low, high = sorted((cond.value, cond.value2))
        if low <= pos <= high:
            return None
        return f"cover position {pos}% is not between {low:g}% and {high:g}%"
    return f"invalid condition: unknown operator '{cond.op}'"


def _check_contact(cond: Condition, cover: CoverContext) -> str | None:
    """Return failure reason or ``None`` when passed."""
    if not cond.accepted:
        return "invalid condition: no accepted contact states"
    if cover.contact_entity_id is None:
        return "no contact sensor configured"
    if cover.contact == CONTACT_UNKNOWN:
        return "contact state is unknown"
    if cover.contact in cond.accepted:
        return None
    return f"contact is '{cover.contact}', expected one of {cond.accepted}"


def _check_numeric_state(cond: Condition, get_state: GetState) -> str | None:
    """Return failure reason or ``None`` when passed."""
    if not cond.entity_id:
        return "invalid condition: missing entity"
    if cond.above is None and cond.below is None:
        return "invalid condition: no threshold"
    state = get_state(cond.entity_id)
    if state in _UNUSABLE_STATES:
        return f"{cond.entity_id} is unavailable"
    try:
        value = float(state)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return f"{cond.entity_id} value '{state}' is not numeric"
    if cond.above is not None and value <= cond.above:
        return f"{cond.entity_id} is {value:g}, not above {cond.above:g}"
    if cond.below is not None and value >= cond.below:
        return f"{cond.entity_id} is {value:g}, not below {cond.below:g}"
    return None


def evaluate_condition(
    cond: Condition, get_state: GetState, cover: CoverContext
) -> str | None:
    """Evaluate one condition; return failure reason or ``None`` when passed."""
    if cond.type in (COND_ENTITY_STATE, COND_ENTITY_STATE_NOT):
        return _check_entity_state(cond, get_state)
    if cond.type == COND_COVER_POSITION:
        return _check_cover_position(cond, cover)
    if cond.type == COND_CONTACT:
        return _check_contact(cond, cover)
    if cond.type == COND_NUMERIC_STATE:
        return _check_numeric_state(cond, get_state)
    return f"invalid condition: unknown type '{cond.type}'"


def _rearm_entities_for(cond: Condition, cover: CoverContext) -> list[str]:
    """External entities whose changes may satisfy this failed condition.

    ``cover_position`` deliberately never re-arms (plan §3): a manually moved
    cover must not cause a surprise automatic run.
    """
    if cond.type == COND_CONTACT:
        return [cover.contact_entity_id] if cover.contact_entity_id else []
    return cond.external_entity_ids()


def _merge_entity_state_conditions(conditions: list[Condition]) -> list[Condition]:
    """Merge multiple ``entity_state`` conditions on the same entity into one.

    Their states are OR-ed — the single deliberate OR in the model (plan
    §2.3). Other condition types are kept as-is, in order.
    """
    merged: list[Condition] = []
    by_entity: dict[str, Condition] = {}
    for cond in conditions:
        if cond.type != COND_ENTITY_STATE or not cond.entity_id:
            merged.append(cond)
            continue
        existing = by_entity.get(cond.entity_id)
        if existing is None:
            copy = Condition(
                type=COND_ENTITY_STATE,
                entity_id=cond.entity_id,
                states=list(cond.states),
            )
            by_entity[cond.entity_id] = copy
            merged.append(copy)
        else:
            existing.states.extend(s for s in cond.states if s not in existing.states)
    return merged


def evaluate_conditions(
    conditions: list[Condition],
    get_state: GetState,
    cover: CoverContext,
) -> EvaluationResult:
    """Evaluate all conditions with AND semantics.

    All conditions are always evaluated (no short-circuit) so that the
    re-arm listener set covers every currently failing condition.
    """
    failed_reasons: list[str] = []
    rearm: set[str] = set()
    for cond in _merge_entity_state_conditions(conditions):
        reason = evaluate_condition(cond, get_state, cover)
        if reason is None:
            continue
        failed_reasons.append(reason)
        rearm.update(_rearm_entities_for(cond, cover))
    return EvaluationResult(
        passed=not failed_reasons,
        failed_reasons=failed_reasons,
        rearm_entity_ids=rearm,
    )
