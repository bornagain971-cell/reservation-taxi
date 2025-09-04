
/* TaxiLI — WAIT HOURS MODE GUARD
   Requirements:
   - Enable "Durée d'attente (heures)" ONLY when (Aller/retour == Oui) AND (Attente pendant trajet == Oui)
   - Allowed values strictly 1..4
   - Keep user's chosen value (session only). No flicker back to 1. No localStorage persistence.
   - When conditions false: disable control and set value to 0.
*/
(function(){
  if (window.__WAIT_HOURS_MODE_GUARD__) return; window.__WAIT_HOURS_MODE_GUARD__ = true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function isYes(v){ v = String(v||'').trim().toLowerCase(); return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on'); }
  function num(v){ v = String(v||'').replace(',','.'); var n = parseFloat(v); return isFinite(n)?n:NaN; }

  // Pickers
  function pickWaitHoursEl(){
    return $('#waitHours') || $('#attenteHeures') || $('#dureeAttente') ||
           document.querySelector('[name="attenteHeures"],[name="dureeAttente"]');
  }
  function pickRoundtripEl(){
    return $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
  }
  function pickAttenteEl(){
    return $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet') || document.querySelector('[name="attente"]');
  }

  // State
  var lastUserChoice = null;
  var internalSet = false;
  var locked = false;

  // Convert any element to accept 1..4 properly
  function normalizeToRange(el){
    if(!el) return;
    var tag = (el.tagName||'').toLowerCase();
    if(tag === 'select'){
      // Rebuild options to 1..4 only, keep user's previous choice if possible
      var keep = (lastUserChoice!=null) ? String(lastUserChoice) : tv(el);
      while(el.firstChild) el.removeChild(el.firstChild);
      ['1','2','3','4'].forEach(function(v){
        var opt = document.createElement('option');
        opt.value = v; opt.textContent = v;
        el.appendChild(opt);
      });
      if(keep && ['1','2','3','4'].includes(keep)){
        el.value = keep;
      } else {
        el.value = '1';
      }
    } else {
      // Input: force type number, min/max/step
      try{ el.setAttribute('type','number'); }catch(e){}
      el.setAttribute('inputmode','numeric');
      el.setAttribute('min','1');
      el.setAttribute('max','4');
      el.setAttribute('step','1');
      // If out of range -> clamp
      var cur = num(tv(el));
      if(!isFinite(cur) || cur<1 || cur>4){
        el.value = (lastUserChoice!=null) ? String(lastUserChoice) : '1';
      }
    }
  }

  // Hard lock against external sets to "1" unless user chose "1"
  function lockValue(el){
    if(locked || !el) return;
    try{
      var proto = Object.getPrototypeOf(el);
      var desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if(!desc || !desc.configurable) { locked = true; return; }
      var _val = el.value;
      Object.defineProperty(el, 'value', {
        configurable: true,
        enumerable: true,
        get(){ return _val; },
        set(v){
          if(!internalSet){
            // If some script forces "1" but user picked something else (2..4), ignore
            if(String(v)==='1' && lastUserChoice!=null && String(lastUserChoice)!=='1'){
              // ignore and keep lastUserChoice visible
              queueMicrotask(()=>{ internalSet=true; try{ el.setAttribute('value', String(lastUserChoice)); }catch(e){} internalSet=false; });
              return;
            }
            // If a script tries to set out-of-range, clamp
            var n = num(v);
            if(!isFinite(n) || n<1 || n>4){
              v = (lastUserChoice!=null) ? String(lastUserChoice) : '1';
            }
          }
          _val = String(v);
        }
      });
      locked = true;
    }catch(e){ locked = true; }
  }

  function enable(el){
    if(!el) return;
    el.removeAttribute('disabled');
    el.classList.remove('is-disabled');
    normalizeToRange(el);
    lockValue(el);
    if(lastUserChoice!=null){
      internalSet = true; el.value = String(lastUserChoice); internalSet = false;
    } else {
      internalSet = true; el.value = el.value || '1'; internalSet = false;
    }
  }

  function disable(el){
    if(!el) return;
    el.setAttribute('disabled','disabled');
    el.classList.add('is-disabled');
    internalSet = true; el.value = '0'; internalSet = false; // 0 hour when disabled
  }

  function currentConditions(){
    var rtEl = pickRoundtripEl();
    var atEl = pickAttenteEl();
    var rt = false, at = false;
    if(rtEl){
      if(rtEl.tagName==='SELECT') rt = isYes(rtEl.value);
      else if(rtEl.type==='checkbox' || rtEl.type==='radio') rt = !!rtEl.checked;
      else rt = isYes(tv(rtEl));
    }
    if(atEl){
      if(atEl.tagName==='SELECT') at = isYes(atEl.value);
      else if(atEl.type==='checkbox' || atEl.type==='radio') at = !!atEl.checked;
      else at = isYes(tv(atEl));
    }
    return {rt:rt, at:at};
  }

  function applyMode(){
    var el = pickWaitHoursEl();
    if(!el) return;
    var cond = currentConditions();
    if(cond.rt && cond.at){
      enable(el);
    } else {
      disable(el);
      lastUserChoice = null; // clear session choice so we don't carry over
    }
  }

  function attachListeners(){
    var el = pickWaitHoursEl();
    if(!el) return;
    // Real user input persists the choice
    function onUserChange(ev){
      if(ev && ev.isTrusted===false) return; // ignore programmatic changes
      var n = num(tv(el));
      if(!isFinite(n) || n<1 || n>4) return;
      lastUserChoice = n;
    }
    el.addEventListener('input', onUserChange, true);
    el.addEventListener('change', onUserChange, true);

    // React to toggles on RT/Attente
    var rt = pickRoundtripEl();
    var at = pickAttenteEl();
    [rt,at].forEach(function(n){
      if(!n) return;
      ['change','input','click'].forEach(function(evt){
        n.addEventListener(evt, applyMode, true);
      });
    });

    // Periodic guard against external scripts
    setInterval(function(){
      var cond = currentConditions();
      var node = pickWaitHoursEl();
      if(!node) return;
      if(cond.rt && cond.at){
        // Must be enabled & normalized, with value consistent 1..4
        if(node.disabled) enable(node);
        normalizeToRange(node);
        // If some script set it to 1 but user choice is different, restore
        var val = tv(node);
        if(lastUserChoice!=null && String(lastUserChoice)!=='1' && String(val)==='1'){
          internalSet = true; node.value = String(lastUserChoice); internalSet = false;
        }
      } else {
        if(!node.disabled) disable(node);
      }
    }, 300);
  }

  // Minimal CSS for disabled state
  var css = document.createElement('style');
  css.textContent = '.is-disabled{opacity:.6; pointer-events:none;}';
  document.head.appendChild(css);

  // Init
  function init(){
    applyMode();
    attachListeners();
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
