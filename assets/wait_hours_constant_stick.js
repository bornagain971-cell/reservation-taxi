
/* TaxiLI — WAIT HOURS CONSTANT STICK
   Keep "Durée d'attente (heures)" CONSTANT on the user's choice (1..4),
   preventing any flicker back to 1 caused by other scripts.
   - Session-based (no localStorage)
   - Clamps input/select to 1..4
   - Restores the user's value immediately whenever something tries to change it
*/
(function(){
  if (window.__WAIT_HOURS_CONSTANT_STICK__) return; window.__WAIT_HOURS_CONSTANT_STICK__ = true;

  let savedVal = null;   // session only
  let internal = false;  // to avoid loops

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function toNum(v){ v = String(v||'').replace(',','.'); var n = parseFloat(v); return isFinite(n)?n:NaN; }
  function clamp14(v){
    var n = toNum(v);
    if(!isFinite(n)) return null;
    if(n<1) n = 1;
    if(n>4) n = 4;
    return n;
  }

  function pickWaitEl(){
    return $('#waitHours') || $('#attenteHeures') || $('#dureeAttente') ||
           document.querySelector('[name="attenteHeures"],[name="dureeAttente"]');
  }

  function setVal(el, v){
    internal = true;
    if(el.tagName === 'SELECT'){
      el.value = String(v);
      Array.from(el.options||[]).forEach(o=> o.selected = (o.value == String(v)));
    } else {
      el.value = String(v);
      el.setAttribute('value', String(v));
    }
    try{
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(e){}
    internal = false;
  }

  // Protect the 'value' setter on this element instance so forced "1" is ignored.
  function protectSetter(el){
    try{
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if(!desc || !desc.configurable) return;
      let _val = el.value;
      Object.defineProperty(el, 'value', {
        configurable: true,
        enumerable: true,
        get(){ return _val; },
        set(v){
          if(!internal){
            // If someone forces "1" while user picked something else, ignore
            if(savedVal!=null && String(savedVal)!=='1' && String(v)==='1'){
              // keep savedVal
              _val = String(savedVal);
              queueMicrotask(()=>{
                internal = true;
                try{ el.setAttribute('value', String(savedVal)); }catch(e){}
                internal = false;
              });
              return;
            }
            // If out of range, clamp to saved or nearest in [1..4]
            let n = clamp14(v);
            if(n==null) n = savedVal!=null ? savedVal : 1;
            _val = String(n);
            return;
          }
          _val = String(v);
        }
      });
    }catch(e){}
  }

  function enforce(){
    const el = pickWaitEl();
    if(!el) return;
    // Ensure bounds
    if(el.tagName !== 'SELECT'){
      el.setAttribute('type','number');
      el.setAttribute('min','1');
      el.setAttribute('max','4');
      el.setAttribute('step','1');
    }
    // Initialise savedVal once
    if(savedVal==null){
      const cur = clamp14(tv(el));
      savedVal = (cur!=null ? cur : 1);
    }
    // If current differs from saved (e.g., jumped to 1), restore saved
    const curNum = toNum(tv(el));
    if(String(curNum) !== String(savedVal)){
      setVal(el, savedVal);
    }
  }

  function onUser(ev){
    const el = pickWaitEl(); if(!el) return;
    if(ev && ev.isTrusted===false) return; // ignore programmatic
    let n = clamp14(tv(el));
    if(n==null) return;
    savedVal = n;
    setVal(el, savedVal);
  }

  function observe(){
    const el = pickWaitEl(); if(!el) return;
    try{
      const mo = new MutationObserver(()=>{ if(!internal) enforce(); });
      mo.observe(el, {attributes:true, attributeFilter:['value','class','disabled'], childList:true, subtree:true});
    }catch(e){}
    // periodic safety net
    setInterval(enforce, 300);
  }

  function init(){
    const el = pickWaitEl();
    if(!el) return;
    protectSetter(el);
    enforce();
    el.addEventListener('input', onUser, true);
    el.addEventListener('change', onUser, true);
    observe();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
