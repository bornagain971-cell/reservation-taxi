
/* TaxiLI — WAIT HOURS STICKY FIX
   Goal: the user's "Durée d'attente (heures)" NEVER reverts to 1 once chosen.
   - Persist user's selection in memory + localStorage
   - Only active (1..4) when (Aller/retour == Oui) AND (Attente == Oui)
   - If any script sets value to "1" programmatically, immediately restore the saved value
   - Does not rebuild <select> options; only sets the selected value safely
*/
(function(){
  if (window.__WAIT_HOURS_STICKY__) return; window.__WAIT_HOURS_STICKY__ = true;

  const LS_KEY = 'taxili_wait_hours_saved';
  let savedVal = null;            // session memory
  let internal = false;           // avoid loops

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function isYes(v){ v = String(v||'').trim().toLowerCase(); return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on'); }
  function toNum(v){ v = String(v||'').replace(',','.'); var n=parseFloat(v); return isFinite(n)?n:NaN; }
  function clamp14(n){
    n = toNum(n);
    if(!isFinite(n)) return null;
    if(n<1) n=1; if(n>4) n=4;
    return n;
  }
  function loadLS(){
    try{ const s = localStorage.getItem(LS_KEY); if(s==null||s==='') return null; const n = clamp14(s); return n; }catch(e){ return null; }
  }
  function saveLS(n){
    try{ localStorage.setItem(LS_KEY, String(n)); }catch(e){}
  }

  function waitEl(){
    return $('#waitHours') || $('#attenteHeures') || $('#dureeAttente') ||
           document.querySelector('[name="attenteHeures"],[name="dureeAttente"]');
  }
  function rtEl(){
    return $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
  }
  function attEl(){
    return $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet') ||
           document.querySelector('[name="attente"]');
  }

  function condActive(){
    const r = rtEl(), a = attEl();
    let rt=false, att=false;
    if(r){
      if(r.tagName==='SELECT') rt = isYes(r.value);
      else if(r.type==='checkbox'||r.type==='radio') rt = !!r.checked;
      else rt = isYes(tv(r));
    }
    if(a){
      if(a.tagName==='SELECT') att = isYes(a.value);
      else if(a.type==='checkbox'||a.type==='radio') att = !!a.checked;
      else att = isYes(tv(a));
    }
    return rt && att;
  }

  function setValue(el, n){
    if(!el) return;
    internal = true;
    if(el.tagName==='SELECT'){
      el.value = String(n);
      // ensure correct option appears selected in DOM
      const opts = Array.from(el.options||[]);
      opts.forEach(o=>{ o.selected = (o.value==String(n)); });
    }else{
      el.value = String(n);
      el.setAttribute('value', String(n));
    }
    // notify listeners
    try{
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }catch(e){}
    internal = false;
  }

  function enable(el){
    if(!el) return;
    el.removeAttribute('disabled');
    el.classList.remove('is-disabled');
  }
  function disable(el){
    if(!el) return;
    el.setAttribute('disabled','disabled');
    el.classList.add('is-disabled');
  }

  function enforce(){
    const el = waitEl();
    if(!el) return;
    const active = condActive();
    if(active){
      enable(el);
      // choose value to display
      if(savedVal==null){
        savedVal = loadLS();
        if(savedVal==null){
          // if user already typed a valid value, keep it; else default 1
          const current = clamp14(tv(el));
          savedVal = (current!=null ? current : 1);
          saveLS(savedVal);
        }
      }
      // If external script forced "1" while savedVal != 1 → restore savedVal
      const cur = tv(el);
      if(String(cur)!==String(savedVal)){
        // if current is out of range, clamp to saved
        const curN = clamp14(cur);
        if(curN==null || String(curN)!==String(savedVal)){
          setValue(el, savedVal);
        }
      }
      // make sure element bounds are sane (if type=number)
      if(el.tagName!=='SELECT'){
        el.setAttribute('type','number'); el.setAttribute('min','1'); el.setAttribute('max','4'); el.setAttribute('step','1');
      }
    } else {
      // inactive: disable and show 0, but DO NOT overwrite savedVal
      disable(el);
      if(tv(el)!=='0'){ setValue(el, 0); }
    }
  }

  function onUserInput(ev){
    const el = waitEl(); if(!el) return;
    if(ev && ev.isTrusted===false) return; // ignore programmatic
    if(!condActive()) return;
    const n = clamp14(tv(el));
    if(n==null) return;
    savedVal = n; saveLS(n);
    // ensure UI reflects exactly user's choice (avoid rounding surprises)
    setValue(el, savedVal);
  }

  function protectAgainstForces(){
    const el = waitEl(); if(!el) return;
    // Observe attribute/child changes that might alter selected option/value
    try{
      const mo = new MutationObserver(()=>{ if(!internal) enforce(); });
      mo.observe(el, {attributes:true, attributeFilter:['value','class','disabled'], subtree:true, childList:true});
    }catch(e){}
    // Global guard after interactions
    ['click','pointerdown','touchstart','focus','blur','change'].forEach(evt=>{
      document.addEventListener(evt, ()=>{ setTimeout(enforce, 0); setTimeout(enforce, 50); setTimeout(enforce, 250); }, true);
    });
    // Periodic safety net
    setInterval(enforce, 500);
  }

  function init(){
    const el = waitEl();
    if(!el) return;
    // Initial enforcement
    enforce();
    // Attach listeners
    el.addEventListener('input', onUserInput, true);
    el.addEventListener('change', onUserInput, true);
    const r = rtEl(), a = attEl();
    [r,a].forEach(n=>{ if(!n) return; ['change','input','click'].forEach(evt=> n.addEventListener(evt, enforce, true)); });
    protectAgainstForces();
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
