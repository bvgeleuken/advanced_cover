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
from typing import Any

from .const import (
    COND_CONTACT,
    COND_COVER_POSITION,
    COND_ENTITY_STATE,
    COND_ENTITY_STATE_NOT,
    COND_NUMERIC_STATE,
    CONTACT_OPEN,
    CONTACT_TILTED,
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


# ---------------------------------------------------------------------------
# Preflight: per-condition evaluation for the live "would run / would skip"
# display in the panel. Verdict (ok) comes from the very same primitives the
# trigger path uses (``evaluate_condition``), so the two never diverge.
# ---------------------------------------------------------------------------

# scope values
SCOPE_SCENARIO = "scenario"
SCOPE_ASSIGNMENT = "assignment"
SCOPE_SAFETY = "safety"

# rollup verdicts
VERDICT_WOULD_RUN = "would_run"
VERDICT_WOULD_SKIP = "would_skip"
VERDICT_UNKNOWN = "unknown"

# i18n summary keys (rendered in the frontend via IntlMessageFormat)
_SUM_ENTITY_STATE = "config_panel.cond_sum_entity_state"
_SUM_ENTITY_STATE_NOT = "config_panel.cond_sum_entity_state_not"
_SUM_COVER_POSITION = "config_panel.cond_sum_cover_position"
_SUM_CONTACT = "config_panel.cond_sum_contact"
_SUM_NUMERIC = "config_panel.cond_sum_numeric"
_SUM_SAFETY = "config_panel.cond_sum_safety"
_SUM_UNAVAILABLE = "config_panel.cond_sum_unavailable"
_SUM_AUTOMATION_DISABLED = "config_panel.cond_sum_automation_disabled"
_SUM_INVALID = "config_panel.cond_sum_invalid"


@dataclass
class ConditionEval:
    """One evaluated condition, ready to render as a checklist line."""

    scope: str
    type: str
    entity_id: str | None
    ok: bool | None  # None = cannot be evaluated (unavailable / missing)
    actual: str | None
    summary_key: str
    summary_values: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for the WebSocket API."""
        return {
            "scope": self.scope,
            "type": self.type,
            "entity_id": self.entity_id,
            "ok": self.ok,
            "actual": self.actual,
            "summary_key": self.summary_key,
            "summary_values": dict(self.summary_values),
        }


def _condition_actual(
    cond: Condition, get_state: GetState, cover: CoverContext
) -> str | None:
    """Raw current value of the entity/quantity a condition looks at."""
    if cond.type in (COND_ENTITY_STATE, COND_ENTITY_STATE_NOT, COND_NUMERIC_STATE):
        return get_state(cond.entity_id) if cond.entity_id else None
    if cond.type == COND_COVER_POSITION:
        return None if cover.position is None else str(cover.position)
    if cond.type == COND_CONTACT:
        return cover.contact
    return None


def _condition_unavailable(
    cond: Condition, get_state: GetState, cover: CoverContext
) -> bool:
    """Return True when a condition cannot be evaluated (missing value)."""
    if cond.type in (COND_ENTITY_STATE, COND_ENTITY_STATE_NOT, COND_NUMERIC_STATE):
        if not cond.entity_id:
            return True
        return get_state(cond.entity_id) in _UNUSABLE_STATES
    if cond.type == COND_COVER_POSITION:
        return cover.position is None
    if cond.type == COND_CONTACT:
        return cover.contact_entity_id is None or cover.contact == CONTACT_UNKNOWN
    return False


def _op_and_value(cond: Condition) -> tuple[str, str]:
    """Human-oriented (operator, value) pair for cover/numeric summaries."""
    if cond.type == COND_COVER_POSITION:
        if cond.op == POSITION_OP_BETWEEN and cond.value is not None:
            low, high = sorted((cond.value, cond.value2 or cond.value))
            return POSITION_OP_BETWEEN, f"{low:g}-{high:g}"
        return cond.op, f"{cond.value:g}" if cond.value is not None else "?"
    # numeric_state
    if cond.above is not None and cond.below is not None:
        return POSITION_OP_BETWEEN, f"{cond.above:g}-{cond.below:g}"
    if cond.above is not None:
        return POSITION_OP_ABOVE, f"{cond.above:g}"
    if cond.below is not None:
        return POSITION_OP_BELOW, f"{cond.below:g}"
    return "?", "?"


def _summary_for(
    cond: Condition, actual: str | None, *, unavailable: bool
) -> tuple[str, dict[str, Any]]:
    """Build (summary_key, values) for a condition's checklist line."""
    if unavailable:
        return _SUM_UNAVAILABLE, {"entity": cond.entity_id or "?"}
    if cond.type == COND_ENTITY_STATE:
        return _SUM_ENTITY_STATE, {
            "entity": cond.entity_id or "?",
            "actual": actual or "?",
            "expected": ", ".join(cond.states),
        }
    if cond.type == COND_ENTITY_STATE_NOT:
        return _SUM_ENTITY_STATE_NOT, {
            "entity": cond.entity_id or "?",
            "expected": ", ".join(cond.states),
        }
    if cond.type == COND_COVER_POSITION:
        op, value = _op_and_value(cond)
        return _SUM_COVER_POSITION, {
            "actual": actual or "?",
            "op": op,
            "value": value,
        }
    if cond.type == COND_CONTACT:
        return _SUM_CONTACT, {
            "actual": actual or "?",
            "expected": ", ".join(cond.accepted),
        }
    if cond.type == COND_NUMERIC_STATE:
        op, value = _op_and_value(cond)
        return _SUM_NUMERIC, {
            "entity": cond.entity_id or "?",
            "actual": actual or "?",
            "op": op,
            "value": value,
        }
    return _SUM_INVALID, {}


def evaluate_condition_eval(
    cond: Condition, get_state: GetState, cover: CoverContext, scope: str
) -> ConditionEval:
    """Evaluate one condition into a render-ready :class:`ConditionEval`.

    ``ok`` uses the exact same primitive as the trigger path
    (:func:`evaluate_condition`): ``None`` reason means pass. A failure is
    reported as ``ok is None`` when the value is simply unavailable, else
    ``ok is False``.
    """
    reason = evaluate_condition(cond, get_state, cover)
    unavailable = _condition_unavailable(cond, get_state, cover)
    ok: bool | None
    if reason is None:
        ok = True
    elif unavailable:
        ok = None
    else:
        ok = False
    actual = _condition_actual(cond, get_state, cover)
    summary_key, summary_values = _summary_for(cond, actual, unavailable=ok is None)
    entity_id = cover.contact_entity_id if cond.type == COND_CONTACT else cond.entity_id
    return ConditionEval(
        scope=scope,
        type=cond.type,
        entity_id=entity_id,
        ok=ok,
        actual=actual,
        summary_key=summary_key,
        summary_values=summary_values,
    )


def evaluate_conditions_detailed(
    conditions: list[Condition],
    get_state: GetState,
    cover: CoverContext,
    scope: str,
) -> list[ConditionEval]:
    """Render-ready evaluation of a condition list (same merge as the engine)."""
    return [
        evaluate_condition_eval(cond, get_state, cover, scope)
        for cond in _merge_entity_state_conditions(conditions)
    ]


def safety_would_block(
    *,
    contact: str,
    block_when_tilted: bool,
    ventilation_position: int,
    target_position: int,
    current_position: int | None,
) -> bool:
    """Whether the safety rule would block this closing move right now.

    Mirrors :meth:`executor.CoverExecutor._apply_safety` as a pure predicate
    so the preflight matches what execution would do (fail-safe: an unknown
    current position counts as a closing move).
    """
    blocking = contact == CONTACT_OPEN or (
        contact == CONTACT_TILTED and block_when_tilted
    )
    if not blocking:
        return False
    if target_position >= ventilation_position:
        return False
    # Fail-safe: an unknown current position counts as a closing move.
    return not (current_position is not None and target_position >= current_position)


def rollup_preflight(evals: list[ConditionEval], evaluated_at: str) -> dict[str, Any]:
    """Roll a list of :class:`ConditionEval` up into a Preflight dict.

    - any ``ok is False``  → ``would_skip``
    - else any ``ok is None`` → ``unknown``
    - else (incl. empty)   → ``would_run``
    """
    failing = sum(1 for e in evals if e.ok is False)
    if failing:
        verdict = VERDICT_WOULD_SKIP
    elif any(e.ok is None for e in evals):
        verdict = VERDICT_UNKNOWN
    else:
        verdict = VERDICT_WOULD_RUN
    return {
        "verdict": verdict,
        "evaluated_at": evaluated_at,
        "failing": failing,
        "conditions": [e.to_dict() for e in evals],
    }


def disabled_condition_eval(scope: str) -> ConditionEval:
    """Return a synthetic failing condition for a disabled master/cover switch."""
    return ConditionEval(
        scope=scope,
        type="automation_disabled",
        entity_id=None,
        ok=False,
        actual=None,
        summary_key=_SUM_AUTOMATION_DISABLED,
        summary_values={},
    )


def safety_condition_eval(*, blocked: bool, ventilation_position: int) -> ConditionEval:
    """Return a ConditionEval line for the per-cover safety rule."""
    return ConditionEval(
        scope=SCOPE_SAFETY,
        type="safety_rule",
        entity_id=None,
        ok=not blocked,
        actual=None,
        summary_key=_SUM_SAFETY,
        summary_values={"ventilation": ventilation_position},
    )
