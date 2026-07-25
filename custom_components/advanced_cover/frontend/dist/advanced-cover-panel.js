/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,e$2=t$2.ShadowRoot&&(void 0===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$3=new WeakMap;let n$2 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$2&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$3.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$3.set(s,t));}return t}toString(){return this.cssText}};const r$2=t=>new n$2("string"==typeof t?t:t+"",void 0,s$2),i$3=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$2(o,t,s$2)},S$1=(s,o)=>{if(e$2)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$2.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$2?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$2(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$2,defineProperty:e$1,getOwnPropertyDescriptor:h$1,getOwnPropertyNames:r$1,getOwnPropertySymbols:o$2,getPrototypeOf:n$1}=Object,a$1=globalThis,c$1=a$1.trustedTypes,l$1=c$1?c$1.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$1=(t,s)=>!i$2(t,s),b$1={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$1};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b$1){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$1(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$1(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b$1}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$1(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$1(t),...o$2(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$2(s));}else void 0!==s&&i.push(c$2(s));return i}static _$Eu(t,s){const i=s.attribute;return  false===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach(t=>t.hostConnected?.());}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.());}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&true===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i,e=false,h){if(void 0!==t){const r=this.constructor;if(false===e&&(h=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??f$1)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,s,i);} false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return  true}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=globalThis,i$1=t=>t,s$1=t$1.trustedTypes,e=s$1?s$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,h="$lit$",o$1=`lit$${Math.random().toFixed(9).slice(2)}$`,n="?"+o$1,r=`<${n}>`,l=document,c=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e?e.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:void 0!==u[1]?c=m:void 0!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p):void 0!==u[3]&&(c=p):c===p?">"===u[0]?(c=n??v,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?p:'"'===u[3]?$:g):c===$||c===g?c=p:c===_||c===m?c=v:(c=p,n=void 0);const x=c===p&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r:d>=0?(e.push(a),s.slice(0,d)+h+s.slice(d)+o$1+x):s+o$1+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h)){const i=v[a++],s=r.getAttribute(t).split(o$1),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$1)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$1),i=t.length-1;if(i>0){r.textContent=s$1?s$1.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c());}}}else if(8===r.nodeType)if(r.data===n)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$1,t+1));)d.push({type:7,index:l}),t+=o$1.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;void 0!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return void 0===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c()),this.O(c()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$1(t).nextSibling;i$1(t).remove(),t=s;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t$1.litHtmlPolyfillSupport;B?.(S,k),(t$1.litHtmlVersions??=[]).push("3.3.3");const D$1=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D$1(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}}i._$litElement$=true,i["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i});const o=s.litElementPolyfillSupport;o?.({LitElement:i});(s.litElementVersions??=[]).push("4.2.2");

const D = "advanced_cover";
const listEntries = (hass) => hass.callWS({ type: `${D}/entries/list` });
const fetchState = (hass, entryId) => hass.callWS({ type: `${D}/state`, entry_id: entryId });
const subscribeState = (hass, entryId, onState) => hass.connection?.subscribeMessage(onState, {
    type: `${D}/subscribe`,
    entry_id: entryId,
});
const saveConfig = (hass, entryId, config) => hass.callWS({ type: `${D}/config/save`, entry_id: entryId, config });
const saveCover = (hass, entryId, cover) => hass.callWS({ type: `${D}/covers/save`, entry_id: entryId, cover });
const deleteCover = (hass, entryId, coverItemId) => hass.callWS({
    type: `${D}/covers/delete`,
    entry_id: entryId,
    cover_item_id: coverItemId,
});
const probeCover = (hass, entityId, contactEntityId) => hass.callWS({
    type: `${D}/covers/probe`,
    entity_id: entityId,
    ...(contactEntityId ? { contact_entity_id: contactEntityId } : {}),
});
const testCover = (hass, entryId, coverItemId, command, position) => hass.callWS({
    type: `${D}/covers/test`,
    entry_id: entryId,
    cover_item_id: coverItemId,
    command,
    ...(position !== undefined ? { position } : {}),
});
const saveScenario = (hass, entryId, scenario) => hass.callWS({ type: `${D}/scenarios/save`, entry_id: entryId, scenario });
const deleteScenario = (hass, entryId, scenarioId) => hass.callWS({
    type: `${D}/scenarios/delete`,
    entry_id: entryId,
    scenario_id: scenarioId,
});
const reorderScenarios = (hass, entryId, scenarioIds) => hass.callWS({
    type: `${D}/scenarios/reorder`,
    entry_id: entryId,
    scenario_ids: scenarioIds,
});
const runScenario = (hass, entryId, scenarioId, options) => hass.callWS({
    type: `${D}/scenarios/run`,
    entry_id: entryId,
    scenario_id: scenarioId,
    ...(options?.coverItemId ? { cover_item_id: options.coverItemId } : {}),
    ignore_conditions: Boolean(options?.ignoreConditions),
});
const recalculate = (hass, entryId) => hass.callWS({ type: `${D}/recalculate`, entry_id: entryId });

function fireEvent(node, type, detail) {
    const event = new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: detail ?? {},
    });
    node.dispatchEvent(event);
}

/** Must match `DOMAIN` in the Python integration. */
const TRANSLATION_DOMAIN = "advanced_cover";
/** Flat key under `component.advanced_cover.*` (e.g. `config_panel.tab_today`). */
function t(hass, path, placeholders) {
    if (!hass?.localize) {
        return path;
    }
    const fullKey = `component.${TRANSLATION_DOMAIN}.${path}`;
    const hasValues = Boolean(placeholders && Object.keys(placeholders).length);
    // HA uses IntlMessageFormat; placeholders must be passed here, not substituted afterward.
    let s = hasValues
        ? hass.localize(fullKey, placeholders)
        : hass.localize(fullKey);
    if (!s || s === fullKey) {
        s = path;
        if (placeholders) {
            for (const [k, v] of Object.entries(placeholders)) {
                s = s.split(`{${k}}`).join(String(v));
            }
        }
    }
    return s;
}

/** Home Assistant may put a string or structured object in `error`. */
function formatApiError(value, hass) {
    const fallback = hass?.localize != null
        ? t(hass, "config_panel.errors_request_failed")
        : "Request failed";
    if (value == null || value === "") {
        return fallback;
    }
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof Error) {
        return value.message;
    }
    if (typeof value === "object") {
        const o = value;
        if (typeof o.message === "string") {
            return o.message;
        }
        if (typeof o.error === "string") {
            return o.error;
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return fallback;
        }
    }
    return String(value);
}
/** Safe when the panel bundle runs twice (navigation, scoped custom element registry). */
function defineCustomElementOnce(name, constructor, options) {
    if (customElements.get(name) !== undefined) {
        return;
    }
    customElements.define(name, constructor, options);
}
const navigate = (_node, path, replace = false) => {
    if (replace) {
        history.replaceState(null, "", path);
    }
    else {
        history.pushState(null, "", path);
    }
    fireEvent(window, "location-changed", { replace });
};
/** "HH:MM" for an ISO timestamp in the user's locale. */
function formatTime(iso) {
    if (!iso)
        return "–";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "–";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
/** Minutes since local midnight for an ISO timestamp (for timeline placement). */
function minutesOfDay(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return null;
    return d.getHours() * 60 + d.getMinutes();
}

/** Wait until core HA custom elements used by the panel are defined. */
async function loadHaPanelElements() {
    const tags = [
        "ha-menu-button",
        "ha-tab-group",
        "ha-tab-group-tab",
        "ha-card",
        "ha-icon",
        "ha-switch",
    ];
    await Promise.all(tags.map((tag) => customElements.whenDefined(tag).catch(() => undefined)));
}

const BASE = "advanced-cover";
const getPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== BASE || parts.length < 2) {
        return { entryId: null, page: "today" };
    }
    return { entryId: parts[1], page: parts[2] || "today" };
};
const exportPath = (entryId, page) => `/${BASE}/${entryId}/${page}`;
/** Deep-link support: `?editScenario=<id>` opens the scenario editor. */
function getEditScenarioQuery() {
    try {
        return new URL(window.location.href).searchParams.get("editScenario");
    }
    catch {
        return null;
    }
}
/**
 * Remove `editScenario` from the URL without dispatching `location-changed`
 * (a navigate() would reload the panel and close the dialog again).
 */
function stripEditScenarioQueryFromUrl() {
    try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("editScenario"))
            return;
        url.searchParams.delete("editScenario");
        const qs = url.searchParams.toString();
        history.replaceState(null, "", url.pathname + (qs ? `?${qs}` : "") + url.hash);
    }
    catch {
        /* ignore */
    }
}

/** Root panel chrome (header, tabs, entry picker). */
const panelStyles = i$3 `
  :host {
    display: block;
    color: var(--primary-text-color);
  }
  .header {
    background-color: var(--app-header-background-color);
    color: var(--app-header-text-color, white);
    border-bottom: var(--app-header-border-bottom, none);
  }
  .toolbar {
    height: var(--header-height);
    display: flex;
    align-items: center;
    font-size: 20px;
    padding: 0 16px;
    font-weight: 400;
    box-sizing: border-box;
  }
  .main-title {
    margin: 0 0 0 24px;
    line-height: 20px;
    flex-grow: 1;
  }
  .version {
    font-size: 14px;
    opacity: 0.85;
  }
  ha-tab-group {
    margin-left: max(env(safe-area-inset-left), 24px);
    margin-right: max(env(safe-area-inset-right), 24px);
    --ha-tab-active-text-color: var(--app-header-text-color, white);
    --ha-tab-indicator-color: var(--app-header-text-color, white);
    --ha-tab-track-color: transparent;
  }
  .view {
    min-height: calc(100vh - 112px);
    display: flex;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }
  .view-inner {
    width: 100%;
    max-width: 920px;
  }
  .entry-picker {
    padding: 24px;
    max-width: 560px;
    margin: 0 auto;
  }
  .entry-picker h2 {
    margin: 0 0 8px;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .entry-picker .lead {
    margin: 0 0 20px;
    color: var(--secondary-text-color);
    line-height: 1.5;
    font-size: 0.95rem;
  }
  .entry-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .entry-card {
    display: block;
    width: 100%;
    text-align: left;
    padding: 16px 18px;
    border-radius: 12px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
    font: inherit;
    box-sizing: border-box;
  }
  .entry-card:hover {
    border-color: var(--primary-color);
  }
  .entry-card-title {
    font-size: 1.1rem;
    font-weight: 600;
  }
  .error {
    color: var(--error-color);
    margin: 8px 0;
  }
  .muted {
    opacity: 0.8;
    font-size: 0.9rem;
  }
`;
/** Shared styles for views: cards, rows, buttons, dialogs, chips, forms. */
const sharedStyles = i$3 `
  ha-card {
    margin-bottom: 20px;
    border-radius: 14px;
  }
  .card-content {
    padding: 20px 22px 22px;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 22px 0;
    font-size: 1.25rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  .card-header ha-icon {
    --mdc-icon-size: 22px;
    color: var(--primary-color);
  }
  .card-header .header-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    font-weight: 400;
  }
  .intro {
    font-size: 0.875rem;
    color: var(--secondary-text-color);
    line-height: 1.5;
    margin: 6px 0 18px;
  }

  /* Expandable inline help (ⓘ) */
  details.inline-help {
    margin: 6px 0 10px;
    font-size: 0.82rem;
  }
  details.inline-help summary {
    cursor: pointer;
    color: var(--secondary-text-color);
    list-style: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    user-select: none;
    transition: color 0.15s ease;
  }
  details.inline-help summary::-webkit-details-marker {
    display: none;
  }
  details.inline-help summary:hover,
  details.inline-help[open] summary {
    color: var(--primary-color);
  }
  details.inline-help .inline-help-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    font-size: 0.72rem;
    line-height: 1;
    border: 1px solid currentColor;
    flex-shrink: 0;
  }
  details.inline-help p {
    margin: 8px 0 4px;
    padding: 10px 14px;
    border-left: 3px solid var(--primary-color);
    border-radius: 0 8px 8px 0;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    color: var(--secondary-text-color);
    line-height: 1.55;
    max-width: 640px;
  }
  .error {
    color: var(--error-color);
    margin: 8px 0;
  }
  .warning {
    color: var(--warning-color, #b85c00);
    margin: 8px 0;
    font-size: 0.875rem;
  }
  .muted {
    color: var(--secondary-text-color);
    font-size: 0.875rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
    margin-bottom: 12px;
  }
  .grow {
    flex: 1;
    min-width: 160px;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--secondary-text-color);
    margin: 26px 0 10px;
  }
  .section-title::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--divider-color);
  }
  .section-desc {
    font-size: 0.825rem;
    color: var(--secondary-text-color);
    margin: 0 0 10px;
    line-height: 1.4;
  }

  /* Buttons */
  .btn,
  .btn-outline,
  .btn-danger,
  .btn-icon {
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    border: 1px solid transparent;
    box-sizing: border-box;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      opacity 0.15s ease;
  }
  .btn {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .btn:hover:not(:disabled) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .btn-outline {
    background: transparent;
    color: var(--primary-color);
    border-color: var(--primary-color);
  }
  .btn-outline:hover:not(:disabled) {
    background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.08);
  }
  .btn-danger {
    background: transparent;
    color: var(--error-color);
    border-color: var(--error-color);
  }
  .btn-danger:hover:not(:disabled) {
    background: rgba(244, 67, 54, 0.08);
  }
  .btn-icon {
    background: transparent;
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
    padding: 6px 10px;
    line-height: 1;
  }
  .btn-icon:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  /* Inputs */
  label.field-label {
    display: block;
    font-size: 0.78rem;
    color: var(--secondary-text-color);
    margin-bottom: 4px;
  }
  input[type="text"],
  input[type="time"],
  input[type="number"],
  select {
    font: inherit;
    color: var(--primary-text-color);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    padding: 8px 10px;
    box-sizing: border-box;
    width: 100%;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
  input[type="range"] {
    width: 100%;
  }
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    font-size: 0.9rem;
  }

  /* Chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    font: inherit;
    font-size: 0.8rem;
    padding: 5px 10px;
    border-radius: 14px;
    border: 1px solid var(--divider-color);
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
  }
  .chip.selected {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color);
  }
  .chip.readonly {
    cursor: default;
    color: var(--secondary-text-color);
  }

  /* Status badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    color: var(--secondary-text-color);
  }
  .badge::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
  .badge-executed {
    color: var(--success-color, #0f9d58);
  }
  .badge-skipped {
    color: var(--secondary-text-color);
  }
  .badge-armed {
    color: var(--warning-color, #b85c00);
  }
  .badge-expired {
    color: var(--secondary-text-color);
  }
  .badge-blocked_safety {
    color: var(--error-color);
  }
  .badge-unavailable {
    color: var(--error-color);
  }
  .badge-planned {
    color: var(--primary-color);
  }

  /* List rows */
  .list-row-wrap {
    display: flex;
    align-items: stretch;
    margin-bottom: 12px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--divider-color);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .list-row-wrap:hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  }
  .list-row-accent {
    width: 6px;
    flex-shrink: 0;
    background: var(--primary-color);
  }
  .list-row-accent.inactive {
    background: var(--disabled-text-color, rgba(158, 158, 158, 0.45));
  }
  .list-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    flex: 1;
    min-width: 0;
    padding: 14px 16px;
  }
  .list-main {
    flex: 1;
    min-width: 160px;
  }
  .list-name {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0 0 4px;
  }
  .list-detail {
    font-size: 0.85rem;
    color: var(--secondary-text-color);
    margin: 0;
    line-height: 1.4;
  }
  .list-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  /* Dialog (plain, works inside scoped registries) */
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 4vh 16px;
    z-index: 10;
    overflow-y: auto;
  }
  .dialog {
    background: var(--card-background-color);
    color: var(--primary-text-color);
    border-radius: 16px;
    width: 100%;
    max-width: 680px;
    padding: 26px 28px;
    box-sizing: border-box;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }
  .dialog h3 {
    margin: 0 0 20px;
    font-size: 1.3rem;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  .dialog-actions .spacer {
    flex: 1;
  }

  /* Condition sentence rows */
  .cond-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 0.9rem;
  }
  .cond-row select,
  .cond-row input {
    width: auto;
    min-width: 90px;
    padding: 5px 8px;
    font-size: 0.85rem;
  }
  .cond-row .cond-entity {
    min-width: 220px;
  }
  .cond-remove {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--secondary-text-color);
    font-size: 1rem;
    cursor: pointer;
    padding: 4px;
  }
  .cond-remove:hover {
    color: var(--error-color);
  }

  .position-bar {
    position: relative;
    height: 8px;
    border-radius: 4px;
    background: var(--divider-color);
    overflow: hidden;
    min-width: 60px;
  }
  .position-bar-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: var(--primary-color);
  }

  /* Empty states */
  .empty-state {
    text-align: center;
    padding: 36px 20px;
    color: var(--secondary-text-color);
  }
  .empty-state ha-icon {
    --mdc-icon-size: 44px;
    opacity: 0.35;
    display: block;
    margin: 0 auto 10px;
  }
  .empty-state p {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  details.expand {
    margin: 8px 0;
  }
  details.expand summary {
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--primary-color);
  }
  table.plain {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  table.plain th,
  table.plain td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--divider-color);
    vertical-align: top;
  }
  table.plain th {
    color: var(--secondary-text-color);
    font-weight: 500;
  }
`;

/** The eight compass points and their azimuth in degrees. */
const COMPASS = [
    ["N", 0],
    ["NE", 45],
    ["E", 90],
    ["SE", 135],
    ["S", 180],
    ["SW", 225],
    ["W", 270],
    ["NW", 315],
];
const COMPASS_BY_DEG = Object.fromEntries(COMPASS.map(([label, deg]) => [deg, label]));
/** Show the compass label for exact matches, otherwise the raw degrees. */
function formatAzimuth(deg) {
    return COMPASS_BY_DEG[deg] ?? `${deg}°`;
}
/**
 * Bucket an azimuth to the nearest of the eight compass points (returned as
 * degrees: 0, 45, … 315). A window at 200° maps to S (180°), at 210° to SW.
 */
function nearestCompassDeg(azimuth) {
    const a = ((azimuth % 360) + 360) % 360;
    return (Math.round(a / 45) % 8) * 45;
}

/** Entity IDs of the given domains, favorites first. */
function entityIdsForDomains(hass, domains, favorites = []) {
    const all = Object.keys(hass.states)
        .filter((eid) => !domains || domains.includes(eid.split(".", 1)[0]))
        .sort((a, b) => a.localeCompare(b));
    if (!favorites.length)
        return all;
    const favSet = new Set(favorites);
    return [...favorites.filter((f) => all.includes(f)), ...all.filter((e) => !favSet.has(e))];
}
/** One shared `<datalist>` per form (by stable `listId`). */
function renderEntityDatalist(hass, listId, domains, favorites = []) {
    const ids = entityIdsForDomains(hass, domains, favorites);
    return b `
    <datalist id=${listId}>
      ${ids.map((id) => b `<option value=${id}></option>`)}
    </datalist>
  `;
}

/**
 * Small expandable info block: a subtle "ⓘ" summary that unfolds an
 * explanation paragraph. Translation keys:
 *   config_panel.help_<key>_title   (short summary label)
 *   config_panel.help_<key>_body    (explanation text)
 */
function renderHelp(hass, key) {
    return b `
    <details class="inline-help">
      <summary>
        <span class="inline-help-icon">ⓘ</span>
        ${t(hass, `config_panel.help_${key}_title`)}
      </summary>
      <p>${t(hass, `config_panel.help_${key}_body`)}</p>
    </details>
  `;
}

const KINDS = ["shutter", "blind", "awning", "curtain", "shade", "other"];
const KIND_ICONS = {
    shutter: "mdi:window-shutter",
    blind: "mdi:blinds-horizontal",
    awning: "mdi:awning-outline",
    curtain: "mdi:curtains",
    shade: "mdi:roller-shade",
    other: "mdi:window-closed-variant",
};
const CONTACT_ICONS = {
    closed: "mdi:window-closed",
    tilted: "mdi:window-open",
    open: "mdi:window-open-variant",
    unknown: "mdi:help-circle-outline",
};
function emptyDraft() {
    return {
        id: "",
        name: "",
        cover_entity_id: "",
        kind: "shutter",
        area_id: null,
        azimuth: null,
        low_mode_entity_id: null,
        low_mode_script_id: null,
        contact_entity_id: null,
        contact_state_map: {},
        safety: { ventilation_position: 20, mode: "block", block_when_tilted: false },
        enabled: true,
    };
}
class ViewCovers extends i {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._draft = null;
        this._draftCaps = null;
        this._testPosition = {};
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        snapshot: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        i$3 `
      .cover-badges {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 0.82rem;
        color: var(--secondary-text-color);
      }
      .cover-badges ha-icon {
        --mdc-icon-size: 17px;
      }
      .pos-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 130px;
      }
      .pos-wrap .position-bar {
        flex: 1;
      }
      .test-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .map-row {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 6px;
      }
      .map-row input,
      .map-row select {
        width: auto;
      }
      .caps-chips {
        margin: 6px 0 0;
      }
    `,
    ]; }
    _areaName(areaId) {
        if (!areaId)
            return "";
        return this.hass.areas?.[areaId]?.name ?? areaId;
    }
    /**
     * Group covers by area for display. Groups are sorted by area name; covers
     * without an area go into a trailing "no area" group. Returns a flat list
     * when no cover has an area assigned, so the plain list stays unchanged.
     */
    _groupByArea(covers) {
        const groups = new Map();
        for (const cover of covers) {
            const key = cover.area_id ?? null;
            const bucket = groups.get(key);
            if (bucket)
                bucket.push(cover);
            else
                groups.set(key, [cover]);
        }
        if (groups.size === 1 && groups.has(null)) {
            return [{ areaId: null, label: "", covers }];
        }
        const withArea = [...groups.entries()]
            .filter(([areaId]) => areaId !== null)
            .map(([areaId, items]) => ({
            areaId,
            label: this._areaName(areaId),
            covers: items,
        }))
            .sort((a, b) => a.label.localeCompare(b.label));
        const noArea = groups.get(null);
        if (noArea) {
            withArea.push({
                areaId: null,
                label: t(this.hass, "config_panel.covers_no_area"),
                covers: noArea,
            });
        }
        return withArea;
    }
    // ------------------------------------------------------------ dialog logic
    _openAdd() {
        this._draft = emptyDraft();
        this._draftCaps = null;
        this._error = undefined;
        this.requestUpdate();
    }
    _openEdit(cover) {
        const { capabilities, current_position, contact_state, next_action, missing_entities, ...item } = cover;
        this._draft = JSON.parse(JSON.stringify(item));
        this._draftCaps = capabilities;
        this._error = undefined;
        this.requestUpdate();
    }
    _patchDraft(patch) {
        if (!this._draft)
            return;
        this._draft = { ...this._draft, ...patch };
        this.requestUpdate();
    }
    async _probe() {
        if (!this._draft?.cover_entity_id)
            return;
        try {
            const res = await probeCover(this.hass, this._draft.cover_entity_id, this._draft.contact_entity_id ?? undefined);
            this._draftCaps = res.capabilities;
            const patch = {};
            if (!this._draft.id) {
                patch.kind = res.suggested_kind;
            }
            if (res.suggested_contact_map &&
                Object.keys(this._draft.contact_state_map).length === 0) {
                patch.contact_state_map = res.suggested_contact_map;
            }
            this._patchDraft(patch);
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
            this.requestUpdate();
        }
    }
    async _save() {
        if (!this._draft)
            return;
        if (!this._draft.name.trim() || !this._draft.cover_entity_id.trim()) {
            this._error = t(this.hass, "config_panel.covers_err_name_entity_required");
            this.requestUpdate();
            return;
        }
        this._busy = true;
        this.requestUpdate();
        try {
            await saveCover(this.hass, this.entryId, this._draft);
            this._draft = null;
            this._error = undefined;
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _delete(cover) {
        if (!window.confirm(t(this.hass, "config_panel.covers_delete_confirm", { name: cover.name }))) {
            return;
        }
        try {
            await deleteCover(this.hass, this.entryId, cover.id);
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
            this.requestUpdate();
        }
    }
    async _toggleEnabled(cover) {
        try {
            await saveCover(this.hass, this.entryId, { ...cover, enabled: !cover.enabled });
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
            this.requestUpdate();
        }
    }
    async _test(cover, command) {
        try {
            await testCover(this.hass, this.entryId, cover.id, command, command === "position" ? (this._testPosition[cover.id] ?? 50) : undefined);
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
            this.requestUpdate();
        }
    }
    // -------------------------------------------------------------- rendering
    _renderRow(cover) {
        const planRuns = this.snapshot.plan.flatMap((occ) => occ.assignments
            .filter((r) => r.cover_item_id === cover.id)
            .map((r) => ({ occ, r })));
        return b `
      <div class="list-row-wrap">
        <div class="list-row-accent ${cover.enabled ? "" : "inactive"}"></div>
        <div class="list-row">
          <div class="list-row-toggle" title=${t(this.hass, "config_panel.covers_toggle_automation")}>
            <ha-switch
              .checked=${cover.enabled}
              @click=${() => this._toggleEnabled(cover)}
            ></ha-switch>
          </div>
          <div class="list-main">
            <p class="list-name">
              <ha-icon .icon=${KIND_ICONS[cover.kind] ?? KIND_ICONS.other}></ha-icon>
              ${cover.name}
            </p>
            <div class="cover-badges">
              ${cover.area_id
            ? b `<span>📍 ${this._areaName(cover.area_id)}</span>`
            : A}
              ${cover.azimuth != null
            ? b `<span>🧭 ${formatAzimuth(cover.azimuth)}</span>`
            : A}
              ${cover.contact_state
            ? b `<span title=${t(this.hass, "config_panel.covers_contact_state")}>
                    <ha-icon
                      .icon=${CONTACT_ICONS[cover.contact_state] ?? CONTACT_ICONS.unknown}
                    ></ha-icon>
                    ${t(this.hass, `config_panel.contact_${cover.contact_state}`)}
                  </span>`
            : A}
              ${cover.next_action
            ? b `<span>
                    ${cover.next_action.armed ? "⏳" : "→"}
                    ${formatTime(cover.next_action.when)} ·
                    ${cover.next_action.position}% (${cover.next_action.scenario_name})
                  </span>`
            : A}
              ${cover.missing_entities.length
            ? b `<span class="badge badge-unavailable"
                    >${t(this.hass, "config_panel.covers_missing_entities", {
                entities: cover.missing_entities.join(", "),
            })}</span
                  >`
            : A}
            </div>
            ${cover.current_position != null
            ? b `
                  <div class="pos-wrap" style="margin-top:8px">
                    <div class="position-bar">
                      <div
                        class="position-bar-fill"
                        style="width:${cover.current_position}%"
                      ></div>
                    </div>
                    <span class="muted">${cover.current_position}%</span>
                  </div>
                `
            : A}
          </div>
          <div class="list-actions">
            <div class="test-row">
              <button class="btn-icon" title=${t(this.hass, "config_panel.covers_test_open")} @click=${() => this._test(cover, "open")}>▲</button>
              <button class="btn-icon" title=${t(this.hass, "config_panel.covers_test_stop")} @click=${() => this._test(cover, "stop")}>■</button>
              <button class="btn-icon" title=${t(this.hass, "config_panel.covers_test_close")} @click=${() => this._test(cover, "close")}>▼</button>
              ${cover.capabilities.supports_position
            ? b `
                    <input
                      type="number"
                      min="0"
                      max="100"
                      style="width:64px"
                      .value=${String(this._testPosition[cover.id] ?? 50)}
                      @input=${(e) => {
                this._testPosition = {
                    ...this._testPosition,
                    [cover.id]: Number(e.target.value),
                };
            }}
                    />
                    <button class="btn-icon" @click=${() => this._test(cover, "position")}>
                      %
                    </button>
                  `
            : A}
            </div>
            <button class="btn-outline" @click=${() => this._openEdit(cover)}>
              ${t(this.hass, "config_panel.covers_edit")}
            </button>
            <button class="btn-danger" @click=${() => this._delete(cover)}>
              ${t(this.hass, "config_panel.covers_delete")}
            </button>
          </div>
          <details class="expand" style="flex-basis:100%">
            <summary>${t(this.hass, "config_panel.covers_today_summary")}</summary>
            ${planRuns.length
            ? b `
                  <table class="plain">
                    ${planRuns.map(({ occ, r }) => b `
                        <tr>
                          <td>${formatTime(occ.planned_at)}</td>
                          <td>${occ.scenario_name}</td>
                          <td>${r.target_position}%</td>
                          <td>
                            <span class="badge badge-${occ.fired ? (r.status === "done" ? (r.result ?? "skipped") : r.status) : "planned"}">
                              ${t(this.hass, `config_panel.status_${occ.fired ? (r.status === "done" ? (r.result ?? "skipped") : r.status) : "planned"}`)}
                            </span>
                          </td>
                          <td class="muted">${r.reason ?? ""}</td>
                        </tr>
                      `)}
                  </table>
                `
            : b `<p class="muted">
                  ${t(this.hass, "config_panel.covers_today_none")}
                </p>`}
          </details>
        </div>
      </div>
    `;
    }
    _renderContactMapEditor(draft) {
        const entries = Object.entries(draft.contact_state_map);
        const meanings = ["closed", "tilted", "open"];
        return b `
      <div class="section-title">
        ${t(this.hass, "config_panel.covers_contact_map_title")}
      </div>
      <p class="section-desc">
        ${t(this.hass, "config_panel.covers_contact_map_desc")}
      </p>
      ${renderHelp(this.hass, "contact_map")}
      ${entries.map(([raw, meaning]) => b `
          <div class="map-row">
            <input
              type="text"
              style="width:140px"
              .value=${raw}
              @change=${(e) => {
            const newRaw = e.target.value.trim();
            const map = { ...draft.contact_state_map };
            delete map[raw];
            if (newRaw)
                map[newRaw] = meaning;
            this._patchDraft({ contact_state_map: map });
        }}
            />
            <span>→</span>
            <select
              .value=${meaning}
              @change=${(e) => this._patchDraft({
            contact_state_map: {
                ...draft.contact_state_map,
                [raw]: e.target.value,
            },
        })}
            >
              ${meanings.map((m) => b `<option value=${m} ?selected=${m === meaning}>
                  ${t(this.hass, `config_panel.contact_${m}`)}
                </option>`)}
            </select>
            <button
              class="cond-remove"
              @click=${() => {
            const map = { ...draft.contact_state_map };
            delete map[raw];
            this._patchDraft({ contact_state_map: map });
        }}
            >
              ✕
            </button>
          </div>
        `)}
      <button
        class="btn-icon"
        @click=${() => this._patchDraft({
            contact_state_map: { ...draft.contact_state_map, "": "closed" },
        })}
      >
        ＋ ${t(this.hass, "config_panel.covers_contact_map_add")}
      </button>
    `;
    }
    _renderDialog() {
        const draft = this._draft;
        if (!draft)
            return A;
        const areas = Object.values(this.hass.areas ?? {});
        const caps = this._draftCaps;
        const isAwning = draft.kind === "awning";
        return b `
      <div class="dialog-backdrop" @click=${(e) => {
            if (e.target === e.currentTarget) {
                this._draft = null;
                this.requestUpdate();
            }
        }}>
        <div class="dialog">
          <h3>
            ${draft.id
            ? t(this.hass, "config_panel.covers_dialog_edit", { name: draft.name })
            : t(this.hass, "config_panel.covers_dialog_new")}
          </h3>
          ${this._error ? b `<p class="error">${this._error}</p>` : A}

          ${renderEntityDatalist(this.hass, "ac-covers-list", ["cover"])}
          ${renderEntityDatalist(this.hass, "ac-contacts-list", [
            "binary_sensor",
            "sensor",
        ])}
          ${renderEntityDatalist(this.hass, "ac-scripts-list", ["script"])}
          <datalist id="ac-areas-list">
            ${areas.map((a) => b `<option value=${a.area_id}>${a.name}</option>`)}
          </datalist>

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_name")}</label>
              <input
                type="text"
                .value=${draft.name}
                @input=${(e) => this._patchDraft({ name: e.target.value })}
              />
            </div>
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_kind")}</label>
              <select
                .value=${draft.kind}
                @change=${(e) => this._patchDraft({ kind: e.target.value })}
              >
                ${KINDS.map((k) => b `<option value=${k} ?selected=${k === draft.kind}>
                    ${t(this.hass, `config_panel.kind_${k}`)}
                  </option>`)}
              </select>
            </div>
          </div>

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_area")}</label>
              <input
                type="text"
                list="ac-areas-list"
                .value=${draft.area_id ?? ""}
                @input=${(e) => this._patchDraft({
            area_id: e.target.value || null,
        })}
              />
            </div>
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_azimuth")}</label>
              <input
                type="number"
                min="0"
                max="359"
                .value=${draft.azimuth == null ? "" : String(draft.azimuth)}
                @input=${(e) => {
            const raw = e.target.value;
            this._patchDraft({ azimuth: raw === "" ? null : Number(raw) });
        }}
              />
            </div>
          </div>
          <div class="chips" style="margin-bottom:12px">
            ${COMPASS.map(([label, deg]) => b `
                <button
                  type="button"
                  class="chip ${draft.azimuth === deg ? "selected" : ""}"
                  @click=${() => this._patchDraft({ azimuth: deg })}
                >
                  ${label}
                </button>
              `)}
          </div>

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_entity")}</label>
              <input
                type="text"
                list="ac-covers-list"
                .value=${draft.cover_entity_id}
                spellcheck="false"
                autocomplete="off"
                @input=${(e) => this._patchDraft({
            cover_entity_id: e.target.value,
        })}
                @change=${() => this._probe()}
              />
            </div>
          </div>
          ${caps
            ? b `
                <div class="chips caps-chips">
                  <span class="chip readonly">
                    ${caps.supports_position ? "✓" : "✕"}
                    ${t(this.hass, "config_panel.covers_cap_position")}
                  </span>
                  <span class="chip readonly">
                    ${caps.supports_tilt ? "✓" : "✕"}
                    ${t(this.hass, "config_panel.covers_cap_tilt")}
                  </span>
                  ${!caps.available
                ? b `<span class="chip readonly">
                        ⚠ ${t(this.hass, "config_panel.covers_cap_unavailable")}
                      </span>`
                : A}
                </div>
              `
            : A}

          <div class="section-title">
            ${t(this.hass, "config_panel.covers_low_mode_title")}
          </div>
          <p class="section-desc">
            ${t(this.hass, "config_panel.covers_low_mode_desc")}
          </p>
          ${renderHelp(this.hass, "low_mode")}
          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_low_entity")}</label>
              <input
                type="text"
                list="ac-covers-list"
                .value=${draft.low_mode_entity_id ?? ""}
                spellcheck="false"
                autocomplete="off"
                @input=${(e) => this._patchDraft({
            low_mode_entity_id: e.target.value || null,
        })}
              />
            </div>
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.covers_field_low_script")}</label>
              <input
                type="text"
                list="ac-scripts-list"
                .value=${draft.low_mode_script_id ?? ""}
                spellcheck="false"
                autocomplete="off"
                @input=${(e) => this._patchDraft({
            low_mode_script_id: e.target.value || null,
        })}
              />
            </div>
          </div>

          ${!isAwning
            ? b `
                <div class="section-title">
                  ${t(this.hass, "config_panel.covers_contact_title")}
                </div>
                <p class="section-desc">
                  ${t(this.hass, "config_panel.covers_contact_desc")}
                </p>
                <div class="row">
                  <div class="grow">
                    <label class="field-label">${t(this.hass, "config_panel.covers_field_contact")}</label>
                    <input
                      type="text"
                      list="ac-contacts-list"
                      .value=${draft.contact_entity_id ?? ""}
                      spellcheck="false"
                      autocomplete="off"
                      @input=${(e) => this._patchDraft({
                contact_entity_id: e.target.value || null,
            })}
                      @change=${() => this._probe()}
                    />
                  </div>
                </div>
                ${draft.contact_entity_id
                ? b `
                      ${this._renderContactMapEditor(draft)}
                      <div class="section-title">
                        ${t(this.hass, "config_panel.covers_safety_title")}
                      </div>
                      <p class="section-desc">
                        ${t(this.hass, "config_panel.covers_safety_desc")}
                      </p>
                      ${renderHelp(this.hass, "safety")}
                      <div class="row">
                        <div class="grow">
                          <label class="field-label">${t(this.hass, "config_panel.covers_field_ventilation")}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            .value=${String(draft.safety.ventilation_position)}
                            @input=${(e) => this._patchDraft({
                    safety: {
                        ...draft.safety,
                        ventilation_position: Number(e.target.value),
                    },
                })}
                          />
                        </div>
                        <div class="grow">
                          <label class="field-label">${t(this.hass, "config_panel.covers_field_safety_mode")}</label>
                          <select
                            .value=${draft.safety.mode}
                            @change=${(e) => this._patchDraft({
                    safety: {
                        ...draft.safety,
                        mode: e.target.value,
                    },
                })}
                          >
                            <option value="block" ?selected=${draft.safety.mode === "block"}>
                              ${t(this.hass, "config_panel.covers_safety_block")}
                            </option>
                            <option value="clamp" ?selected=${draft.safety.mode === "clamp"}>
                              ${t(this.hass, "config_panel.covers_safety_clamp")}
                            </option>
                          </select>
                        </div>
                      </div>
                      <label class="checkbox-row">
                        <input
                          type="checkbox"
                          .checked=${draft.safety.block_when_tilted}
                          @change=${(e) => this._patchDraft({
                    safety: {
                        ...draft.safety,
                        block_when_tilted: e.target
                            .checked,
                    },
                })}
                        />
                        ${t(this.hass, "config_panel.covers_safety_tilted")}
                      </label>
                    `
                : A}
              `
            : A}

          <div class="dialog-actions">
            <button
              class="btn-outline"
              @click=${() => {
            this._draft = null;
            this.requestUpdate();
        }}
            >
              ${t(this.hass, "config_panel.cancel")}
            </button>
            <button class="btn" .disabled=${this._busy} @click=${this._save}>
              ${this._busy
            ? t(this.hass, "config_panel.saving")
            : t(this.hass, "config_panel.save")}
            </button>
          </div>
        </div>
      </div>
    `;
    }
    render() {
        const snap = this.snapshot;
        if (!snap)
            return A;
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:window-shutter-cog"></ha-icon>
          ${t(this.hass, "config_panel.covers_title")}
          <span class="header-actions">
            <button class="btn" @click=${this._openAdd}>
              ＋ ${t(this.hass, "config_panel.covers_add")}
            </button>
          </span>
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.covers_intro")}</p>
          ${this._error && !this._draft
            ? b `<p class="error">${this._error}</p>`
            : A}
          ${snap.covers.length
            ? this._groupByArea(snap.covers).map((group) => group.label
                ? b `
                      <div class="section-title">
                        <ha-icon icon="mdi:floor-plan"></ha-icon>
                        ${group.label}
                        <span class="muted">${group.covers.length}</span>
                      </div>
                      ${group.covers.map((c) => this._renderRow(c))}
                    `
                : group.covers.map((c) => this._renderRow(c)))
            : b `<div class="empty-state">
                <ha-icon icon="mdi:window-shutter-alert"></ha-icon>
                <p>${t(this.hass, "config_panel.covers_empty")}</p>
              </div>`}
        </div>
      </ha-card>
      ${this._renderDialog()}
    `;
    }
}
defineCustomElementOnce("ac-view-covers", ViewCovers);

class ViewLog extends i {
    constructor() {
        super(...arguments);
        this._coverFilter = "";
        this._showRaw = false;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        snapshot: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        i$3 `
      pre.raw {
        font-size: 0.75rem;
        overflow-x: auto;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
        padding: 12px;
        border-radius: 8px;
      }
    `,
    ]; }
    render() {
        const snap = this.snapshot;
        if (!snap)
            return A;
        const entries = snap.log.filter((e) => !this._coverFilter || e.cover_item_id === this._coverFilter);
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:history"></ha-icon>
          ${t(this.hass, "config_panel.log_title")}
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.log_intro")}</p>
          <div class="row">
            <div>
              <label class="field-label">${t(this.hass, "config_panel.log_filter_cover")}</label>
              <select
                style="width:auto"
                @change=${(e) => {
            this._coverFilter = e.target.value;
            this.requestUpdate();
        }}
              >
                <option value="">${t(this.hass, "config_panel.log_filter_all")}</option>
                ${snap.covers.map((c) => b `
                    <option value=${c.id} ?selected=${this._coverFilter === c.id}>
                      ${c.name}
                    </option>
                  `)}
              </select>
            </div>
          </div>
          ${entries.length
            ? b `
                <table class="plain">
                  <tr>
                    <th>${t(this.hass, "config_panel.log_col_time")}</th>
                    <th>${t(this.hass, "config_panel.log_col_cover")}</th>
                    <th>${t(this.hass, "config_panel.log_col_scenario")}</th>
                    <th>${t(this.hass, "config_panel.log_col_result")}</th>
                    <th>${t(this.hass, "config_panel.log_col_reason")}</th>
                  </tr>
                  ${entries.map((e) => b `
                      <tr>
                        <td>${formatTime(e.time)}</td>
                        <td>${e.cover_name}</td>
                        <td>${e.scenario_name}</td>
                        <td>
                          <span class="badge badge-${e.result}">
                            ${t(this.hass, `config_panel.status_${e.result}`)}
                          </span>
                          ${e.position != null
                ? b `<span class="muted"> ${e.position}%</span>`
                : A}
                        </td>
                        <td class="muted">${e.reason ?? ""}</td>
                      </tr>
                    `)}
                </table>
              `
            : b `<div class="empty-state">
                <ha-icon icon="mdi:text-box-outline"></ha-icon>
                <p>${t(this.hass, "config_panel.log_empty")}</p>
              </div>`}
          <details
            class="expand"
            @toggle=${(e) => {
            this._showRaw = e.target.open;
            this.requestUpdate();
        }}
          >
            <summary>${t(this.hass, "config_panel.log_show_raw")}</summary>
            ${this._showRaw
            ? b `<pre class="raw">${JSON.stringify(snap, null, 2)}</pre>`
            : A}
          </details>
        </div>
      </ha-card>
    `;
    }
}
defineCustomElementOnce("ac-view-log", ViewLog);

const CONTACT_STATES = ["closed", "tilted", "open"];
function emptyCondition(type) {
    switch (type) {
        case "cover_position":
            return { type, op: "above", value: 5, value2: null };
        case "contact":
            return { type, accepted: ["closed"] };
        case "numeric_state":
            return { type, entity_id: "", above: null, below: null };
        default:
            return { type, entity_id: "", states: [] };
    }
}
/** Known states of an entity for the state suggestion list. */
function knownStates(hass, entityId) {
    if (!entityId)
        return [];
    const st = hass.states[entityId];
    if (!st)
        return [];
    const states = new Set([st.state]);
    const domain = entityId.split(".", 1)[0];
    if (domain === "input_select" || domain === "select") {
        for (const opt of st.attributes?.options ?? []) {
            states.add(opt);
        }
    }
    if (domain === "binary_sensor" || domain === "input_boolean" || domain === "switch") {
        states.add("on");
        states.add("off");
    }
    return [...states];
}
function update(opts, index, patch) {
    const next = opts.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    opts.onChange(next);
}
function remove(opts, index) {
    opts.onChange(opts.conditions.filter((_, i) => i !== index));
}
function renderStateChips(opts, index, cond) {
    const states = cond.states ?? [];
    const listId = `${opts.entityListId}-states-${index}`;
    const suggestions = knownStates(opts.hass, cond.entity_id);
    const addState = (input) => {
        const value = input.value.trim();
        if (!value || states.includes(value))
            return;
        update(opts, index, { states: [...states, value] });
        input.value = "";
    };
    return b `
    <span class="chips">
      ${states.map((s) => b `
          <button
            type="button"
            class="chip selected"
            title=${t(opts.hass, "config_panel.cond_remove_state")}
            @click=${() => update(opts, index, { states: states.filter((x) => x !== s) })}
          >
            ${s} ✕
          </button>
        `)}
    </span>
    <input
      type="text"
      style="min-width:110px"
      list=${listId}
      placeholder=${t(opts.hass, "config_panel.cond_state_placeholder")}
      @keydown=${(e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addState(e.target);
        }
    }}
      @change=${(e) => addState(e.target)}
    />
    <datalist id=${listId}>
      ${suggestions.map((s) => b `<option value=${s}></option>`)}
    </datalist>
  `;
}
function renderCondition(opts, cond, index) {
    const { hass } = opts;
    let body;
    switch (cond.type) {
        case "entity_state":
        case "entity_state_not":
            body = b `
        <span>${t(hass, "config_panel.cond_only_if")}</span>
        <input
          type="text"
          class="cond-entity"
          list=${opts.entityListId}
          .value=${cond.entity_id ?? ""}
          spellcheck="false"
          autocomplete="off"
          @input=${(e) => update(opts, index, {
                entity_id: e.target.value,
            })}
        />
        <span>
          ${cond.type === "entity_state"
                ? t(hass, "config_panel.cond_is_one_of")
                : t(hass, "config_panel.cond_is_none_of")}
        </span>
        ${renderStateChips(opts, index, cond)}
      `;
            break;
        case "cover_position":
            body = b `
        <span>${t(hass, "config_panel.cond_position_prefix")}</span>
        <select
          .value=${cond.op ?? "above"}
          @change=${(e) => update(opts, index, {
                op: e.target.value,
            })}
        >
          <option value="above">${t(hass, "config_panel.cond_op_above")}</option>
          <option value="below">${t(hass, "config_panel.cond_op_below")}</option>
          <option value="between">${t(hass, "config_panel.cond_op_between")}</option>
        </select>
        <input
          type="number"
          min="0"
          max="100"
          style="width:80px"
          .value=${String(cond.value ?? 0)}
          @input=${(e) => update(opts, index, {
                value: Number(e.target.value),
            })}
        />
        ${cond.op === "between"
                ? b `
              <span>${t(hass, "config_panel.cond_and")}</span>
              <input
                type="number"
                min="0"
                max="100"
                style="width:80px"
                .value=${String(cond.value2 ?? 100)}
                @input=${(e) => update(opts, index, {
                    value2: Number(e.target.value),
                })}
              />
            `
                : A}
        <span>${t(hass, "config_panel.cond_position_suffix")}</span>
      `;
            break;
        case "contact":
            body = b `
        <span>${t(hass, "config_panel.cond_contact_prefix")}</span>
        <span class="chips">
          ${CONTACT_STATES.map((s) => {
                const accepted = cond.accepted ?? [];
                const selected = accepted.includes(s);
                return b `
              <button
                type="button"
                class="chip ${selected ? "selected" : ""}"
                @click=${() => update(opts, index, {
                    accepted: selected
                        ? accepted.filter((x) => x !== s)
                        : [...accepted, s],
                })}
              >
                ${t(hass, `config_panel.contact_${s}`)}
              </button>
            `;
            })}
        </span>
      `;
            break;
        case "numeric_state":
            body = b `
        <span>${t(hass, "config_panel.cond_only_if")}</span>
        <input
          type="text"
          class="cond-entity"
          list=${opts.entityListId}
          .value=${cond.entity_id ?? ""}
          spellcheck="false"
          autocomplete="off"
          @input=${(e) => update(opts, index, {
                entity_id: e.target.value,
            })}
        />
        <span>${t(hass, "config_panel.cond_numeric_above")}</span>
        <input
          type="number"
          style="width:90px"
          .value=${cond.above == null ? "" : String(cond.above)}
          @input=${(e) => {
                const raw = e.target.value;
                update(opts, index, { above: raw === "" ? null : Number(raw) });
            }}
        />
        <span>${t(hass, "config_panel.cond_numeric_below")}</span>
        <input
          type="number"
          style="width:90px"
          .value=${cond.below == null ? "" : String(cond.below)}
          @input=${(e) => {
                const raw = e.target.value;
                update(opts, index, { below: raw === "" ? null : Number(raw) });
            }}
        />
      `;
            break;
        default:
            body = b `<span class="muted">?</span>`;
    }
    return b `
    <div class="cond-row">
      ${body}
      <button
        type="button"
        class="cond-remove"
        title=${t(hass, "config_panel.cond_remove")}
        @click=${() => remove(opts, index)}
      >
        ✕
      </button>
    </div>
  `;
}
/** Sentence-builder condition list (AND semantics, no operators). */
function renderConditionEditor(opts) {
    const { hass } = opts;
    const types = [
        "entity_state",
        "entity_state_not",
        "cover_position",
        "numeric_state",
        ...(opts.contactAvailable ? ["contact"] : []),
    ];
    return b `
    <div>
      ${opts.conditions.length
        ? b `<p class="muted">${t(hass, "config_panel.cond_all_must_match")}</p>`
        : A}
      ${opts.conditions.map((c, i) => renderCondition(opts, c, i))}
      <div class="row">
        <select
          @change=${(e) => {
        const sel = e.target;
        if (!sel.value)
            return;
        opts.onChange([
            ...opts.conditions,
            emptyCondition(sel.value),
        ]);
        sel.value = "";
    }}
        >
          <option value="">
            ＋ ${t(hass, "config_panel.cond_add")}
          </option>
          ${types.map((ct) => b `
              <option value=${ct}>${t(hass, `config_panel.cond_type_${ct}`)}</option>
            `)}
        </select>
      </div>
    </div>
  `;
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const RANDOM_WINDOWS = [0, 15, 30, 60];
const RETRY_WINDOWS = [0, 60, 120, 240, 480];
function emptyScenario() {
    return {
        id: "",
        name: "",
        enabled: true,
        trigger: { type: "fixed_time", time_local: "07:00", sun_event: "sunset", offset_min: 0 },
        random_window_min: 0,
        random_direction: "both",
        weekdays: [...WEEKDAYS],
        conditions: [],
        retry_window_min: 0,
        action: { position: 0, tilt_position: null, mode: "normal", min_position_delta: null },
        assignments: [],
    };
}
function emptyOverride() {
    return { position: null, tilt_position: null, mode: null, min_position_delta: null };
}
class ViewScenarios extends i {
    constructor() {
        super(...arguments);
        this._warnings = [];
        this._busy = false;
        this._draft = null;
        this._runIgnoreConditions = false;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        snapshot: { attribute: false },
        editScenarioId: { type: String },
    }; }
    static { this.styles = [
        sharedStyles,
        i$3 `
      .order-buttons {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .order-buttons button {
        padding: 2px 8px;
        line-height: 1;
      }
      .seg {
        display: inline-flex;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        overflow: hidden;
      }
      .seg button {
        font: inherit;
        font-size: 0.875rem;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        padding: 8px 14px;
        cursor: pointer;
      }
      .seg button.selected {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .assignment-box {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .assignment-head {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .assignment-head .name {
        font-weight: 600;
        flex: 1;
        min-width: 120px;
      }
      .slider-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .slider-row input[type="number"] {
        width: 76px;
      }
      .quick-add {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 8px;
        margin-bottom: 10px;
      }
      .quick-add-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--secondary-text-color);
      }
      .quick-add-group {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        padding-left: 8px;
        border-left: 1px solid var(--divider-color);
      }
      .quick-add-sub {
        font-size: 0.76rem;
        color: var(--secondary-text-color);
      }
      .quick-add .chip {
        white-space: nowrap;
      }
    `,
    ]; }
    updated() {
        if (this.editScenarioId &&
            this._openedDeepLink !== this.editScenarioId &&
            this.snapshot) {
            const scenario = this.snapshot.scenarios.find((s) => s.id === this.editScenarioId);
            this._openedDeepLink = this.editScenarioId;
            stripEditScenarioQueryFromUrl();
            if (scenario) {
                this._openEdit(scenario);
            }
        }
    }
    // ------------------------------------------------------------------ helpers
    _coverName(coverItemId) {
        return (this.snapshot.covers.find((c) => c.id === coverItemId)?.name ?? coverItemId);
    }
    _areaName(areaId) {
        return this.hass.areas?.[areaId]?.name ?? areaId;
    }
    _triggerSummary(s) {
        const trig = s.trigger.type === "fixed_time"
            ? (s.trigger.time_local ?? "")
            : `${t(this.hass, `config_panel.sun_${s.trigger.sun_event}`)}${s.trigger.offset_min
                ? ` ${s.trigger.offset_min > 0 ? "+" : ""}${s.trigger.offset_min} min`
                : ""}`;
        const random = s.random_window_min
            ? ` ± ${s.random_window_min} min`
            : "";
        const days = s.weekdays.length === 7
            ? t(this.hass, "config_panel.weekdays_all")
            : s.weekdays
                .map((d) => t(this.hass, `config_panel.weekday_${d}`))
                .join(" ");
        return `${trig}${random} · ${days}`;
    }
    _todayTime(s) {
        const occ = this.snapshot.plan.find((o) => o.scenario_id === s.id);
        return occ ? formatTime(occ.planned_at) : null;
    }
    _patch(patch) {
        if (!this._draft)
            return;
        this._draft = { ...this._draft, ...patch };
        this.requestUpdate();
    }
    // ------------------------------------------------------------------ actions
    _openAdd() {
        this._draft = emptyScenario();
        this._error = undefined;
        this._warnings = [];
        this.requestUpdate();
    }
    _openEdit(scenario) {
        this._draft = JSON.parse(JSON.stringify(scenario));
        this._error = undefined;
        this._warnings = scenario.warnings ?? [];
        this.requestUpdate();
    }
    _duplicate(scenario) {
        const copy = JSON.parse(JSON.stringify(scenario));
        copy.id = "";
        copy.name = `${copy.name} (copy)`;
        this._draft = copy;
        this._error = undefined;
        this._warnings = [];
        this.requestUpdate();
    }
    async _save() {
        if (!this._draft)
            return;
        if (!this._draft.name.trim()) {
            this._error = t(this.hass, "config_panel.scenarios_err_name_required");
            this.requestUpdate();
            return;
        }
        this._busy = true;
        this.requestUpdate();
        try {
            const res = await saveScenario(this.hass, this.entryId, this._draft);
            if (res.warnings?.length) {
                this._warnings = res.warnings;
                this._draft = { ...this._draft, id: res.id };
            }
            else {
                this._draft = null;
                this._warnings = [];
            }
            this._error = undefined;
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _delete(scenario) {
        if (!window.confirm(t(this.hass, "config_panel.scenarios_delete_confirm", {
            name: scenario.name,
        }))) {
            return;
        }
        try {
            await deleteScenario(this.hass, this.entryId, scenario.id);
            if (this._draft?.id === scenario.id)
                this._draft = null;
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
        }
        this.requestUpdate();
    }
    async _toggleEnabled(scenario) {
        try {
            const { warnings, ...payload } = scenario;
            await saveScenario(this.hass, this.entryId, {
                ...payload,
                enabled: !scenario.enabled,
            });
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
            this.requestUpdate();
        }
    }
    async _move(scenario, delta) {
        const ids = this.snapshot.scenarios.map((s) => s.id);
        const idx = ids.indexOf(scenario.id);
        const target = idx + delta;
        if (idx < 0 || target < 0 || target >= ids.length)
            return;
        [ids[idx], ids[target]] = [ids[target], ids[idx]];
        try {
            await reorderScenarios(this.hass, this.entryId, ids);
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
            this.requestUpdate();
        }
    }
    async _runNow(scenarioId) {
        this._busy = true;
        this.requestUpdate();
        try {
            await runScenario(this.hass, this.entryId, scenarioId, {
                ignoreConditions: this._runIgnoreConditions,
            });
            this._error = undefined;
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    // ---------------------------------------------------------------- rendering
    _renderRow(scenario, index, total) {
        const today = this._todayTime(scenario);
        return b `
      <div class="list-row-wrap">
        <div class="list-row-accent ${scenario.enabled ? "" : "inactive"}"></div>
        <div class="list-row">
          <div class="order-buttons">
            <button class="btn-icon" .disabled=${index === 0}
              title=${t(this.hass, "config_panel.scenarios_move_up")}
              @click=${() => this._move(scenario, -1)}>▲</button>
            <button class="btn-icon" .disabled=${index === total - 1}
              title=${t(this.hass, "config_panel.scenarios_move_down")}
              @click=${() => this._move(scenario, 1)}>▼</button>
          </div>
          <ha-switch
            .checked=${scenario.enabled}
            @click=${() => this._toggleEnabled(scenario)}
          ></ha-switch>
          <div class="list-main">
            <p class="list-name">${scenario.name}</p>
            <p class="list-detail">
              ${this._triggerSummary(scenario)} ·
              ${t(this.hass, "config_panel.scenarios_covers_count", {
            n: scenario.assignments.length,
        })}
              ${today
            ? b ` · ${t(this.hass, "config_panel.scenarios_today_at", {
                time: today,
            })}`
            : A}
              → ${scenario.action.position}%
            </p>
            ${scenario.warnings?.length
            ? b `<p class="warning">⚠ ${scenario.warnings.join(" · ")}</p>`
            : A}
          </div>
          <div class="list-actions">
            <button class="btn-outline" @click=${() => this._openEdit(scenario)}>
              ${t(this.hass, "config_panel.scenarios_edit")}
            </button>
            <button class="btn-danger" @click=${() => this._delete(scenario)}>
              ${t(this.hass, "config_panel.scenarios_delete")}
            </button>
          </div>
        </div>
      </div>
    `;
    }
    _renderWhenSection(draft) {
        return b `
      <div class="section-title">${t(this.hass, "config_panel.scenarios_when")}</div>
      <div class="row">
        <div class="seg">
          <button
            type="button"
            class=${draft.trigger.type === "fixed_time" ? "selected" : ""}
            @click=${() => this._patch({ trigger: { ...draft.trigger, type: "fixed_time" } })}
          >
            ${t(this.hass, "config_panel.trigger_fixed_time")}
          </button>
          <button
            type="button"
            class=${draft.trigger.type === "sun_event" ? "selected" : ""}
            @click=${() => this._patch({ trigger: { ...draft.trigger, type: "sun_event" } })}
          >
            ${t(this.hass, "config_panel.trigger_sun")}
          </button>
        </div>
        ${draft.trigger.type === "fixed_time"
            ? b `
              <input
                type="time"
                style="width:auto"
                .value=${draft.trigger.time_local ?? "07:00"}
                @input=${(e) => this._patch({
                trigger: {
                    ...draft.trigger,
                    time_local: e.target.value,
                },
            })}
              />
            `
            : b `
              <select
                style="width:auto"
                .value=${draft.trigger.sun_event ?? "sunset"}
                @change=${(e) => this._patch({
                trigger: {
                    ...draft.trigger,
                    sun_event: e.target
                        .value,
                },
            })}
              >
                ${["sunrise", "sunset", "solar_noon"].map((ev) => b `
                    <option value=${ev} ?selected=${draft.trigger.sun_event === ev}>
                      ${t(this.hass, `config_panel.sun_${ev}`)}
                    </option>
                  `)}
              </select>
              <div>
                <label class="field-label">${t(this.hass, "config_panel.scenarios_offset_min")}</label>
                <input
                  type="number"
                  min="-720"
                  max="720"
                  style="width:90px"
                  .value=${String(draft.trigger.offset_min ?? 0)}
                  @input=${(e) => this._patch({
                trigger: {
                    ...draft.trigger,
                    offset_min: Number(e.target.value),
                },
            })}
                />
              </div>
            `}
      </div>

      <label class="field-label">${t(this.hass, "config_panel.scenarios_random")}</label>
      ${renderHelp(this.hass, "random")}
      <div class="row">
        <span class="chips">
          ${RANDOM_WINDOWS.map((w) => b `
              <button
                type="button"
                class="chip ${draft.random_window_min === w ? "selected" : ""}"
                @click=${() => this._patch({ random_window_min: w })}
              >
                ${w === 0 ? t(this.hass, "config_panel.off") : `${w} min`}
              </button>
            `)}
        </span>
        ${draft.random_window_min
            ? b `
              <select
                style="width:auto"
                .value=${draft.random_direction}
                @change=${(e) => this._patch({
                random_direction: e.target
                    .value,
            })}
              >
                ${["after", "before", "both"].map((d) => b `
                    <option value=${d} ?selected=${draft.random_direction === d}>
                      ${t(this.hass, `config_panel.random_${d}`)}
                    </option>
                  `)}
              </select>
            `
            : A}
      </div>

      <label class="field-label">${t(this.hass, "config_panel.scenarios_weekdays")}</label>
      <div class="chips" style="margin-bottom:12px">
        ${WEEKDAYS.map((d) => {
            const selected = draft.weekdays.includes(d);
            return b `
            <button
              type="button"
              class="chip ${selected ? "selected" : ""}"
              @click=${() => this._patch({
                weekdays: selected
                    ? draft.weekdays.filter((x) => x !== d)
                    : [...draft.weekdays, d],
            })}
            >
              ${t(this.hass, `config_panel.weekday_${d}`)}
            </button>
          `;
        })}
      </div>

      <label class="field-label">${t(this.hass, "config_panel.scenarios_retry")}</label>
      <div class="chips" style="margin-bottom:4px">
        ${RETRY_WINDOWS.map((w) => b `
            <button
              type="button"
              class="chip ${draft.retry_window_min === w ? "selected" : ""}"
              @click=${() => this._patch({ retry_window_min: w })}
            >
              ${w === 0
            ? t(this.hass, "config_panel.off")
            : w < 120
                ? `${w} min`
                : `${w / 60} h`}
            </button>
          `)}
      </div>
      <p class="section-desc">${t(this.hass, "config_panel.scenarios_retry_hint")}</p>
      ${renderHelp(this.hass, "retry")}
    `;
    }
    _renderThenSection(draft) {
        const anyTilt = draft.assignments.some((a) => this.snapshot.covers.find((c) => c.id === a.cover_item_id)?.capabilities
            .supports_tilt);
        return b `
      <div class="section-title">${t(this.hass, "config_panel.scenarios_then")}</div>
      <div class="slider-row">
        <span class="muted">${t(this.hass, "config_panel.scenarios_position")}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          .value=${String(draft.action.position)}
          @input=${(e) => this._patch({
            action: {
                ...draft.action,
                position: Number(e.target.value),
            },
        })}
        />
        <input
          type="number"
          min="0"
          max="100"
          .value=${String(draft.action.position)}
          @input=${(e) => this._patch({
            action: {
                ...draft.action,
                position: Number(e.target.value),
            },
        })}
        />
        <span class="muted">%</span>
      </div>
      <p class="section-desc">${t(this.hass, "config_panel.scenarios_position_hint")}</p>
      ${anyTilt
            ? b `
            <div class="slider-row">
              <span class="muted">${t(this.hass, "config_panel.scenarios_tilt")}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                .value=${String(draft.action.tilt_position ?? 0)}
                .disabled=${draft.action.tilt_position == null}
                @input=${(e) => this._patch({
                action: {
                    ...draft.action,
                    tilt_position: Number(e.target.value),
                },
            })}
              />
              <label class="checkbox-row" style="margin:0">
                <input
                  type="checkbox"
                  .checked=${draft.action.tilt_position != null}
                  @change=${(e) => this._patch({
                action: {
                    ...draft.action,
                    tilt_position: e.target.checked
                        ? 50
                        : null,
                },
            })}
                />
                ${draft.action.tilt_position != null
                ? `${draft.action.tilt_position}%`
                : t(this.hass, "config_panel.off")}
              </label>
            </div>
          `
            : A}
      <div class="row" style="margin-top:8px">
        <div>
          <label class="field-label">${t(this.hass, "config_panel.scenarios_mode")}</label>
          <select
            style="width:auto"
            .value=${draft.action.mode}
            @change=${(e) => this._patch({
            action: {
                ...draft.action,
                mode: e.target.value,
            },
        })}
          >
            <option value="normal" ?selected=${draft.action.mode === "normal"}>
              ${t(this.hass, "config_panel.mode_normal")}
            </option>
            <option value="low" ?selected=${draft.action.mode === "low"}>
              ${t(this.hass, "config_panel.mode_low")}
            </option>
          </select>
        </div>
      </div>
      ${renderHelp(this.hass, "mode_low")}
      <details class="expand">
        <summary>${t(this.hass, "config_panel.scenarios_advanced")}</summary>
        <div class="row" style="margin-top:8px">
          <div>
            <label class="field-label">${t(this.hass, "config_panel.scenarios_min_delta")}</label>
            <input
              type="number"
              min="0"
              max="100"
              style="width:90px"
              placeholder=${String(this.snapshot.config.default_min_position_delta)}
              .value=${draft.action.min_position_delta == null
            ? ""
            : String(draft.action.min_position_delta)}
              @input=${(e) => {
            const raw = e.target.value;
            this._patch({
                action: {
                    ...draft.action,
                    min_position_delta: raw === "" ? null : Number(raw),
                },
            });
        }}
            />
          </div>
        </div>
        <p class="section-desc">${t(this.hass, "config_panel.scenarios_min_delta_hint")}</p>
        ${renderHelp(this.hass, "min_delta")}
      </details>
    `;
    }
    _patchAssignment(index, patch) {
        if (!this._draft)
            return;
        const assignments = this._draft.assignments.map((a, i) => i === index ? { ...a, ...patch } : a);
        this._patch({ assignments });
    }
    /** Append the given covers as assignments, skipping already-assigned ones. */
    _addCovers(covers) {
        if (!this._draft || !covers.length)
            return;
        const assigned = new Set(this._draft.assignments.map((a) => a.cover_item_id));
        const additions = covers
            .filter((c) => !assigned.has(c.id))
            .map((c) => ({
            cover_item_id: c.id,
            extra_conditions: [],
            action_override: null,
        }));
        if (!additions.length)
            return;
        this._patch({ assignments: [...this._draft.assignments, ...additions] });
    }
    _renderAssignment(draft, assignment, index) {
        const cover = this.snapshot.covers.find((c) => c.id === assignment.cover_item_id);
        const ov = assignment.action_override ?? emptyOverride();
        const hasOverride = ov.position != null || ov.tilt_position != null || ov.mode != null;
        return b `
      <div class="assignment-box">
        <div class="assignment-head">
          <span class="name">${this._coverName(assignment.cover_item_id)}</span>
          ${assignment.extra_conditions.length
            ? b `<span class="badge">${t(this.hass, "config_panel.scenarios_extra_conditions_badge", { n: assignment.extra_conditions.length })}</span>`
            : A}
          ${hasOverride
            ? b `<span class="badge">${t(this.hass, "config_panel.scenarios_override_badge")}</span>`
            : A}
          <button
            class="cond-remove"
            title=${t(this.hass, "config_panel.scenarios_remove_cover")}
            @click=${() => this._patch({
            assignments: draft.assignments.filter((_, i) => i !== index),
        })}
          >
            ✕
          </button>
        </div>
        <details class="expand">
          <summary>${t(this.hass, "config_panel.scenarios_assignment_details")}</summary>
          <div class="section-title">
            ${t(this.hass, "config_panel.scenarios_extra_conditions")}
          </div>
          <p class="section-desc">
            ${t(this.hass, "config_panel.scenarios_extra_conditions_desc")}
          </p>
          ${renderConditionEditor({
            hass: this.hass,
            conditions: assignment.extra_conditions,
            onChange: (conds) => this._patchAssignment(index, { extra_conditions: conds }),
            entityListId: "ac-all-entities",
            contactAvailable: Boolean(cover?.contact_entity_id),
        })}
          <div class="section-title">
            ${t(this.hass, "config_panel.scenarios_override")}
          </div>
          ${renderHelp(this.hass, "override")}
          <div class="row">
            <div>
              <label class="field-label">${t(this.hass, "config_panel.scenarios_position")}</label>
              <input
                type="number"
                min="0"
                max="100"
                style="width:90px"
                placeholder=${String(draft.action.position)}
                .value=${ov.position == null ? "" : String(ov.position)}
                @input=${(e) => {
            const raw = e.target.value;
            this._patchAssignment(index, {
                action_override: {
                    ...ov,
                    position: raw === "" ? null : Number(raw),
                },
            });
        }}
              />
            </div>
            ${cover?.capabilities.supports_tilt
            ? b `
                  <div>
                    <label class="field-label">${t(this.hass, "config_panel.scenarios_tilt")}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      style="width:90px"
                      .value=${ov.tilt_position == null ? "" : String(ov.tilt_position)}
                      @input=${(e) => {
                const raw = e.target.value;
                this._patchAssignment(index, {
                    action_override: {
                        ...ov,
                        tilt_position: raw === "" ? null : Number(raw),
                    },
                });
            }}
                    />
                  </div>
                `
            : A}
            <div>
              <label class="field-label">${t(this.hass, "config_panel.scenarios_mode")}</label>
              <select
                style="width:auto"
                @change=${(e) => {
            const value = e.target.value;
            this._patchAssignment(index, {
                action_override: {
                    ...ov,
                    mode: value === "" ? null : value,
                },
            });
        }}
              >
                <option value="" ?selected=${ov.mode == null}>
                  ${t(this.hass, "config_panel.scenarios_inherit")}
                </option>
                <option value="normal" ?selected=${ov.mode === "normal"}>
                  ${t(this.hass, "config_panel.mode_normal")}
                </option>
                <option value="low" ?selected=${ov.mode === "low"}>
                  ${t(this.hass, "config_panel.mode_low")}
                </option>
              </select>
            </div>
          </div>
        </details>
      </div>
    `;
    }
    _renderQuickAdd(addable) {
        if (!addable.length)
            return A;
        // Direction buckets: nearest-of-8 compass point per cover azimuth.
        const byDir = new Map();
        for (const c of addable) {
            if (c.azimuth == null)
                continue;
            const deg = nearestCompassDeg(c.azimuth);
            (byDir.get(deg) ?? byDir.set(deg, []).get(deg)).push(c);
        }
        // Room buckets, sorted by area name.
        const byArea = new Map();
        for (const c of addable) {
            if (!c.area_id)
                continue;
            (byArea.get(c.area_id) ?? byArea.set(c.area_id, []).get(c.area_id)).push(c);
        }
        const areas = [...byArea.entries()]
            .map(([id, covers]) => ({ id, name: this._areaName(id), covers }))
            .sort((a, b) => a.name.localeCompare(b.name));
        const anyDir = [...byDir.values()].some((v) => v.length);
        return b `
      <div class="quick-add">
        <span class="quick-add-label"
          >${t(this.hass, "config_panel.scenarios_quick_add")}</span
        >
        <button
          type="button"
          class="chip"
          @click=${() => this._addCovers(addable)}
        >
          ＋ ${t(this.hass, "config_panel.scenarios_quick_add_all", {
            n: addable.length,
        })}
        </button>
        ${anyDir
            ? b `<span class="quick-add-group">
              <span class="quick-add-sub"
                >${t(this.hass, "config_panel.scenarios_quick_add_direction")}</span
              >
              ${COMPASS.map(([label, deg]) => {
                const covers = byDir.get(deg) ?? [];
                return covers.length
                    ? b `<button
                      type="button"
                      class="chip"
                      title=${t(this.hass, "config_panel.scenarios_quick_add_direction_title", {
                        label,
                        n: covers.length,
                    })}
                      @click=${() => this._addCovers(covers)}
                    >
                      🧭 ${label} ·${covers.length}
                    </button>`
                    : A;
            })}
            </span>`
            : A}
        ${areas.length
            ? b `<span class="quick-add-group">
              <span class="quick-add-sub"
                >${t(this.hass, "config_panel.scenarios_quick_add_room")}</span
              >
              ${areas.map((a) => b `<button
                  type="button"
                  class="chip"
                  @click=${() => this._addCovers(a.covers)}
                >
                  📍 ${a.name} ·${a.covers.length}
                </button>`)}
            </span>`
            : A}
      </div>
    `;
    }
    _renderCoversSection(draft) {
        const assignedIds = new Set(draft.assignments.map((a) => a.cover_item_id));
        const addable = this.snapshot.covers.filter((c) => !assignedIds.has(c.id));
        return b `
      <div class="section-title">${t(this.hass, "config_panel.scenarios_covers")}</div>
      ${renderHelp(this.hass, "assignments")}
      ${this._renderQuickAdd(addable)}
      ${draft.assignments.map((a, i) => this._renderAssignment(draft, a, i))}
      ${addable.length
            ? b `
            <select
              @change=${(e) => {
                const sel = e.target;
                if (!sel.value)
                    return;
                this._patch({
                    assignments: [
                        ...draft.assignments,
                        {
                            cover_item_id: sel.value,
                            extra_conditions: [],
                            action_override: null,
                        },
                    ],
                });
                sel.value = "";
            }}
            >
              <option value="">
                ＋ ${t(this.hass, "config_panel.scenarios_add_cover")}
              </option>
              ${addable.map((c) => b `<option value=${c.id}>${c.name}</option>`)}
            </select>
          `
            : A}
      ${!this.snapshot.covers.length
            ? b `<p class="muted">${t(this.hass, "config_panel.scenarios_no_covers_hint")}</p>`
            : A}
    `;
    }
    _renderDialog() {
        const draft = this._draft;
        if (!draft)
            return A;
        return b `
      <div class="dialog-backdrop" @click=${(e) => {
            if (e.target === e.currentTarget) {
                this._draft = null;
                this.requestUpdate();
            }
        }}>
        <div class="dialog" style="max-width:760px">
          <h3>
            ${draft.id
            ? t(this.hass, "config_panel.scenarios_dialog_edit", { name: draft.name })
            : t(this.hass, "config_panel.scenarios_dialog_new")}
          </h3>
          ${this._error ? b `<p class="error">${this._error}</p>` : A}
          ${this._warnings.map((w) => b `<p class="warning">⚠ ${w}</p>`)}

          ${renderEntityDatalist(this.hass, "ac-all-entities", null, this.snapshot.config.favorite_entity_ids)}

          <div class="row">
            <div class="grow">
              <label class="field-label">${t(this.hass, "config_panel.scenarios_field_name")}</label>
              <input
                type="text"
                .value=${draft.name}
                @input=${(e) => this._patch({ name: e.target.value })}
              />
            </div>
            <label class="checkbox-row" style="margin:0 0 6px">
              <input
                type="checkbox"
                .checked=${draft.enabled}
                @change=${(e) => this._patch({ enabled: e.target.checked })}
              />
              ${t(this.hass, "config_panel.scenarios_enabled")}
            </label>
          </div>

          ${this._renderWhenSection(draft)}

          <div class="section-title">${t(this.hass, "config_panel.scenarios_only_if")}</div>
          <p class="section-desc">
            ${t(this.hass, "config_panel.scenarios_only_if_desc")}
          </p>
          ${renderConditionEditor({
            hass: this.hass,
            conditions: draft.conditions,
            onChange: (conds) => this._patch({ conditions: conds }),
            entityListId: "ac-all-entities",
            contactAvailable: draft.assignments.some((a) => Boolean(this.snapshot.covers.find((c) => c.id === a.cover_item_id)
                ?.contact_entity_id)),
        })}

          ${this._renderThenSection(draft)}
          ${this._renderCoversSection(draft)}

          <div class="dialog-actions">
            ${draft.id
            ? b `
                  <label class="checkbox-row" style="margin:0">
                    <input
                      type="checkbox"
                      .checked=${this._runIgnoreConditions}
                      @change=${(e) => {
                this._runIgnoreConditions = e.target.checked;
            }}
                    />
                    ${t(this.hass, "config_panel.scenarios_run_ignore")}
                  </label>
                  <button
                    class="btn-outline"
                    .disabled=${this._busy}
                    @click=${() => this._runNow(draft.id)}
                  >
                    ${t(this.hass, "config_panel.scenarios_run_now")}
                  </button>
                `
            : A}
            <span class="spacer"></span>
            <button
              class="btn-outline"
              @click=${() => {
            this._draft = null;
            this.requestUpdate();
        }}
            >
              ${t(this.hass, "config_panel.cancel")}
            </button>
            <button class="btn" .disabled=${this._busy} @click=${this._save}>
              ${this._busy
            ? t(this.hass, "config_panel.saving")
            : t(this.hass, "config_panel.save")}
            </button>
          </div>
        </div>
      </div>
    `;
    }
    render() {
        const snap = this.snapshot;
        if (!snap)
            return A;
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:script-text-outline"></ha-icon>
          ${t(this.hass, "config_panel.scenarios_title")}
          <span class="header-actions">
            <button class="btn" @click=${this._openAdd}>
              ＋ ${t(this.hass, "config_panel.scenarios_add")}
            </button>
          </span>
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.scenarios_intro")}</p>
          ${renderHelp(this.hass, "priority")}
          ${this._error && !this._draft
            ? b `<p class="error">${this._error}</p>`
            : A}
          ${snap.scenarios.length
            ? snap.scenarios.map((s, i) => this._renderRow(s, i, snap.scenarios.length))
            : b `<div class="empty-state">
                <ha-icon icon="mdi:script-text-outline"></ha-icon>
                <p>${t(this.hass, "config_panel.scenarios_empty")}</p>
              </div>`}
        </div>
      </ha-card>
      ${this._renderDialog()}
    `;
    }
}
defineCustomElementOnce("ac-view-scenarios", ViewScenarios);

/** Aggregate status of one planned assignment for coloring. */
function runBadge(occ, run) {
    if (!occ.fired)
        return "planned";
    if (run.status === "armed")
        return "armed";
    if (run.status === "expired")
        return "expired";
    return run.result ?? "skipped";
}
class ViewToday extends i {
    constructor() {
        super(...arguments);
        this._busy = false;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        snapshot: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        i$3 `
      .head-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 20px;
        padding: 4px 0;
      }
      .head-row .spacer {
        flex: 1;
      }
      .sun {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        white-space: nowrap;
      }
      .master {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95rem;
      }
      .track-wrap {
        margin: 18px 4px 4px;
      }
      .track {
        position: relative;
        height: 34px;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
      }
      .track .hour-grid {
        position: absolute;
        inset: 0;
        display: flex;
      }
      .track .hour-grid span {
        flex: 1;
        border-left: 1px solid var(--divider-color);
        opacity: 0.5;
      }
      .track .hour-grid span:first-child {
        border-left: none;
      }
      .dot {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--primary-color);
        border: 2px solid var(--card-background-color);
        box-sizing: border-box;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        transition: transform 0.12s ease;
      }
      .dot:hover {
        transform: translate(-50%, -50%) scale(1.35);
        z-index: 1;
      }
      .dot.executed {
        background: var(--success-color, #0f9d58);
      }
      .dot.skipped,
      .dot.expired {
        background: var(--disabled-text-color, #9e9e9e);
      }
      .dot.armed {
        background: var(--warning-color, #f4b400);
      }
      .dot.blocked_safety,
      .dot.unavailable {
        background: var(--error-color, #d93025);
      }
      .now-line {
        position: absolute;
        top: -4px;
        bottom: -4px;
        width: 2px;
        background: var(--accent-color, #ff9800);
      }
      .axis {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: var(--secondary-text-color);
        margin-top: 4px;
      }
      .occ {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 10px;
      }
      .occ-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 8px 14px;
        margin-bottom: 6px;
      }
      .occ-time {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .occ-name {
        font-weight: 500;
        cursor: pointer;
        color: var(--primary-color);
        background: none;
        border: none;
        font: inherit;
        padding: 0;
      }
      .occ-meta {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .occ-assignments {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .assignment-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        border: 1px solid var(--divider-color);
        border-radius: 14px;
        padding: 4px 10px;
      }
    `,
    ]; }
    async _toggleMaster() {
        this._busy = true;
        this.requestUpdate();
        try {
            await saveConfig(this.hass, this.entryId, {
                enabled: !this.snapshot.config.enabled,
            });
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _recalculate() {
        this._busy = true;
        this.requestUpdate();
        try {
            await recalculate(this.hass, this.entryId);
            this._error = undefined;
        }
        catch (e) {
            this._error = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    _openScenario(scenarioId) {
        navigate(this, `${exportPath(this.entryId, "scenarios")}?editScenario=${scenarioId}`);
    }
    _renderTrack() {
        const occs = this.snapshot.plan;
        const nowMin = minutesOfDay(this.snapshot.now) ?? 0;
        return b `
      <div class="track-wrap">
        <div class="track">
          <div class="hour-grid">
            ${Array.from({ length: 24 }, () => b `<span></span>`)}
          </div>
          <div class="now-line" style="left:${(nowMin / 1440) * 100}%"></div>
          ${occs.map((occ) => {
            const m = minutesOfDay(occ.planned_at);
            if (m == null)
                return A;
            const worst = occ.assignments.length
                ? runBadge(occ, occ.assignments[0])
                : "planned";
            return b `
              <div
                class="dot ${worst}"
                style="left:${(m / 1440) * 100}%"
                title="${formatTime(occ.planned_at)} · ${occ.scenario_name}"
                @click=${() => this._openScenario(occ.scenario_id)}
              ></div>
            `;
        })}
        </div>
        <div class="axis">
          <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span
          ><span>24:00</span>
        </div>
      </div>
    `;
    }
    _renderOccurrence(occ) {
        return b `
      <div class="occ">
        <div class="occ-head">
          <span class="occ-time">${formatTime(occ.planned_at)}</span>
          <button class="occ-name" @click=${() => this._openScenario(occ.scenario_id)}>
            ${occ.scenario_name}
          </button>
          ${occ.random_offset_min
            ? b `<span class="occ-meta"
                >${t(this.hass, "config_panel.today_random_offset", {
                n: occ.random_offset_min,
            })}</span
              >`
            : A}
          ${occ.retry_until
            ? b `<span class="occ-meta"
                >${t(this.hass, "config_panel.today_retry_until", {
                time: formatTime(occ.retry_until),
            })}</span
              >`
            : A}
        </div>
        <div class="occ-assignments">
          ${occ.assignments.map((run) => {
            const badge = runBadge(occ, run);
            const title = run.reason ?? "";
            return b `
              <span class="assignment-chip" title=${title}>
                ${run.cover_name} → ${run.target_position}%
                <span class="badge badge-${badge}"
                  >${t(this.hass, `config_panel.status_${badge}`)}</span
                >
                ${run.status === "armed" && run.armed_until
                ? b `<span class="occ-meta"
                      >⏳ ${formatTime(run.armed_until)}</span
                    >`
                : A}
              </span>
            `;
        })}
          ${!occ.assignments.length
            ? b `<span class="muted"
                >${t(this.hass, "config_panel.today_no_assignments")}</span
              >`
            : A}
        </div>
      </div>
    `;
    }
    render() {
        const snap = this.snapshot;
        if (!snap)
            return A;
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          ${t(this.hass, "config_panel.today_title")}
          <span class="header-actions">
            <span class="sun">
              ☀︎↑ ${formatTime(snap.sun.sunrise)} · ☀︎↓ ${formatTime(snap.sun.sunset)}
            </span>
            <button
              type="button"
              class="btn-outline"
              .disabled=${this._busy}
              @click=${this._recalculate}
            >
              ${t(this.hass, "config_panel.today_recalculate")}
            </button>
          </span>
        </div>
        <div class="card-content">
          <div class="head-row">
            <label class="master">
              <ha-switch
                .checked=${snap.config.enabled}
                .disabled=${this._busy}
                @click=${this._toggleMaster}
              ></ha-switch>
              ${t(this.hass, "config_panel.today_master")}
            </label>
          </div>
          ${this._error ? b `<p class="error">${this._error}</p>` : A}
          ${!snap.config.enabled
            ? b `<p class="warning">
                ${t(this.hass, "config_panel.today_master_off_hint")}
              </p>`
            : A}
          ${this._renderTrack()}
        </div>
      </ha-card>
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
          ${t(this.hass, "config_panel.today_plan_title")}
        </div>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.today_intro")}</p>
          ${renderHelp(this.hass, "today_statuses")}
          ${snap.plan.length
            ? snap.plan.map((occ) => this._renderOccurrence(occ))
            : b `<div class="empty-state">
                <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
                <p>
                  ${snap.scenarios.length
                ? t(this.hass, "config_panel.today_empty_nothing_planned")
                : t(this.hass, "config_panel.today_empty_no_scenarios")}
                </p>
              </div>`}
        </div>
      </ha-card>
    `;
    }
}
defineCustomElementOnce("ac-view-today", ViewToday);

const VERSION = "0.2.0";
const PANEL_PAGES = ["today", "covers", "scenarios", "log"];
const TAB_LABEL_KEYS = {
    today: "config_panel.tab_today",
    covers: "config_panel.tab_covers",
    scenarios: "config_panel.tab_scenarios",
    log: "config_panel.tab_log",
};
function normalizePage(raw) {
    const p = raw || "today";
    return PANEL_PAGES.includes(p) ? p : "today";
}
class AdvancedCoverPanel extends i {
    constructor() {
        super(...arguments);
        this.narrow = false;
        this._snapshot = null;
        this._loading = true;
        this._entries = [];
        this._entriesLoading = false;
        this._initialPanelI18nDone = false;
        this._onVisibility = () => {
            if (document.visibilityState !== "visible")
                return;
            if (!window.location.pathname.includes("advanced-cover"))
                return;
            const { entryId } = getPath();
            if (entryId && this.hass) {
                void this._refreshOnce(entryId);
            }
        };
        this._locChanged = () => {
            if (!window.location.pathname.includes("advanced-cover"))
                return;
            void this._reloadPath();
        };
    }
    static { this.properties = {
        hass: { attribute: false },
        narrow: { type: Boolean, reflect: true },
        route: { attribute: false },
        panel: { attribute: false },
    }; }
    static { this.styles = panelStyles; }
    setProperties(props) {
        if (props.hass !== undefined) {
            const next = props.hass;
            if (this.hass?.language !== next?.language) {
                this._panelI18nLang = undefined;
            }
            this.hass = next;
            void this._ensurePanelI18n();
        }
        if (props.narrow !== undefined)
            this.narrow = Boolean(props.narrow);
        if (props.route !== undefined)
            this.route = props.route;
        if (props.panel !== undefined)
            this.panel = props.panel;
        this.requestUpdate();
    }
    async _ensurePanelI18n() {
        if (!this.hass)
            return;
        if (!this.hass.loadBackendTranslation) {
            this._markI18nDone();
            return;
        }
        const lang = this.hass.language ?? "en";
        if (this._panelI18nLang === lang) {
            this._markI18nDone();
            return;
        }
        try {
            await this.hass.loadBackendTranslation("config_panel", TRANSLATION_DOMAIN);
        }
        catch {
            /* localize may keep returning missing keys */
        }
        this._panelI18nLang = lang;
        this._markI18nDone();
    }
    _markI18nDone() {
        if (!this._initialPanelI18nDone) {
            this._initialPanelI18nDone = true;
        }
        this.requestUpdate();
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("location-changed", this._locChanged);
        document.addEventListener("visibilitychange", this._onVisibility);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("location-changed", this._locChanged);
        document.removeEventListener("visibilitychange", this._onVisibility);
        void this._teardownSubscription();
    }
    async _teardownSubscription() {
        if (this._unsub) {
            try {
                await this._unsub();
            }
            catch {
                /* ignore */
            }
            this._unsub = undefined;
        }
        this._subscribedEntryId = undefined;
    }
    async _refreshOnce(entryId) {
        if (!this.hass)
            return;
        try {
            this._snapshot = await fetchState(this.hass, entryId);
            this._error = undefined;
        }
        catch (e) {
            this._error = String(e);
        }
        this.requestUpdate();
    }
    async _ensureSubscription(entryId) {
        if (!this.hass || this._subscribedEntryId === entryId)
            return;
        await this._teardownSubscription();
        this._subscribedEntryId = entryId;
        try {
            const unsubPromise = subscribeState(this.hass, entryId, (snapshot) => {
                this._snapshot = snapshot;
                this._loading = false;
                this._error = undefined;
                this.requestUpdate();
            });
            if (unsubPromise) {
                this._unsub = await unsubPromise;
            }
            else {
                // No connection object: fall back to a one-shot fetch.
                await this._refreshOnce(entryId);
                this._loading = false;
            }
        }
        catch (e) {
            this._error = String(e);
            this._loading = false;
            this._subscribedEntryId = undefined;
        }
        this.requestUpdate();
    }
    async _reloadPath() {
        const { entryId } = getPath();
        if (!entryId) {
            await this._teardownSubscription();
            this._snapshot = null;
            await this._loadEntryList();
            /* A concurrent reload may have navigated to an entry meanwhile. */
            if (getPath().entryId) {
                this.requestUpdate();
                return;
            }
            if (this._entries.length === 1) {
                navigate(this, exportPath(this._entries[0].entry_id, "today"), true);
                return;
            }
            this._loading = false;
            this.requestUpdate();
            return;
        }
        this._loading = this._snapshot === null;
        this.requestUpdate();
        await this._ensureSubscription(entryId);
    }
    async _loadEntryList() {
        if (!this.hass)
            return;
        this._entriesLoading = true;
        this.requestUpdate();
        try {
            this._entries = await listEntries(this.hass);
            this._error = undefined;
        }
        catch (e) {
            this._error = String(e);
            this._entries = [];
        }
        finally {
            this._entriesLoading = false;
            this.requestUpdate();
        }
    }
    async firstUpdated() {
        await loadHaPanelElements();
        await this._ensurePanelI18n();
        if (this.hass) {
            await this._reloadPath();
        }
    }
    updated(changed) {
        if (!changed.has("hass") || !this.hass)
            return;
        const prev = changed.get("hass");
        if (prev === undefined || prev.connection !== this.hass.connection) {
            this._subscribedEntryId = undefined;
            void this._reloadPath();
        }
    }
    _onTab(ev) {
        const name = ev.detail?.name;
        const { entryId, page } = getPath();
        if (!name || !entryId || name === page)
            return;
        navigate(this, exportPath(entryId, name));
        this.requestUpdate();
    }
    render() {
        if (!this.hass || !this._initialPanelI18nDone) {
            return b `<div class="view"><div class="view-inner">Loading…</div></div>`;
        }
        const path = getPath();
        const page = normalizePage(path.page);
        if (!path.entryId) {
            return b `
        <div class="entry-picker">
          <h2>${t(this.hass, "config_panel.entry_picker_title")}</h2>
          <p class="lead">${t(this.hass, "config_panel.entry_picker_lead")}</p>
          ${this._error ? b `<p class="error">${this._error}</p>` : A}
          ${this._entriesLoading
                ? b `<p class="muted">${t(this.hass, "config_panel.loading")}</p>`
                : A}
          <div class="entry-cards">
            ${this._entries.map((e) => b `
                <button
                  type="button"
                  class="entry-card"
                  @click=${() => navigate(this, exportPath(e.entry_id, "today"))}
                >
                  <div class="entry-card-title">${e.name}</div>
                </button>
              `)}
          </div>
          ${!this._entries.length && !this._entriesLoading
                ? b `<p class="muted">
                ${t(this.hass, "config_panel.entry_picker_empty")}
              </p>`
                : A}
        </div>
      `;
        }
        if (this._loading || !this._snapshot) {
            return b `<div class="view">
        <div class="view-inner">
          ${this._error || t(this.hass, "config_panel.loading")}
        </div>
      </div>`;
        }
        return b `
      <div class="header">
        <div class="toolbar">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div class="main-title">${t(this.hass, "config_panel.main_title")}</div>
          <div class="version">v${VERSION}</div>
        </div>
        <ha-tab-group @wa-tab-show=${this._onTab}>
          ${PANEL_PAGES.map((p) => b `
              <ha-tab-group-tab slot="nav" panel=${p} .active=${page === p}>
                ${t(this.hass, TAB_LABEL_KEYS[p])}
              </ha-tab-group-tab>
            `)}
        </ha-tab-group>
      </div>
      <div class="view">
        <div class="view-inner">
          ${page === "today"
            ? b `<ac-view-today
                .hass=${this.hass}
                .entryId=${path.entryId}
                .snapshot=${this._snapshot}
              ></ac-view-today>`
            : A}
          ${page === "covers"
            ? b `<ac-view-covers
                .hass=${this.hass}
                .entryId=${path.entryId}
                .snapshot=${this._snapshot}
              ></ac-view-covers>`
            : A}
          ${page === "scenarios"
            ? b `<ac-view-scenarios
                .hass=${this.hass}
                .entryId=${path.entryId}
                .snapshot=${this._snapshot}
                .editScenarioId=${getEditScenarioQuery() ?? undefined}
              ></ac-view-scenarios>`
            : A}
          ${page === "log"
            ? b `<ac-view-log
                .hass=${this.hass}
                .entryId=${path.entryId}
                .snapshot=${this._snapshot}
              ></ac-view-log>`
            : A}
        </div>
      </div>
    `;
    }
}
defineCustomElementOnce("advanced-cover-panel", AdvancedCoverPanel);

export { AdvancedCoverPanel };
//# sourceMappingURL=advanced-cover-panel.js.map
