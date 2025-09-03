
/* TaxiLI - Force Aller/Retour bridge (keeps legacy logic intact)
   - Mirrors #roundtrip -> hidden #allerRetour and #ar so old code sees "Oui/Non"
   - Forces recalculation by dispatching 'change'/'input' on mirrors
   - Provides window.roundTripOn() override as safety net
*/
(function(){
  function $(sel){ return document.querySelector(sel); }
  function isYes(v){
    v = (v||'').toString().trim().toLowerCase();
    return v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on';
  }
  function getSrc(){
    return document.getElementById('roundtrip')
        || document.querySelector('[name="roundtrip"]')
        || document.querySelector('[data-role="roundtrip"]');
  }
  function ensureMirror(id){
    var el = document.getElementById(id);
    if(!el){
      el = document.createElement('select');
      el.id = id;
      el.style.display = 'none';
      var optN = document.createElement('option'); optN.value='Non'; optN.text='Non';
      var optO = document.createElement('option'); optO.value='Oui'; optO.text='Oui';
      el.appendChild(optN); el.appendChild(optO);
      (document.body || document.documentElement).appendChild(el);
    } else {
      // make sure options exist
      var vals = Array.from(el.options).map(o=>o.value);
      if(!vals.includes('Non')){ var a=document.createElement('option'); a.value='Non'; a.text='Non'; el.appendChild(a); }
      if(!vals.includes('Oui')){ var b=document.createElement('option'); b.value='Oui'; b.text='Oui'; el.appendChild(b); }
    }
    return el;
  }
  function srcIsOn(src){
    if(!src) return false;
    if(src.tagName === 'SELECT') return isYes(src.value);
    if(src.type==='checkbox' || src.type==='radio') return !!src.checked;
    var aria = src.getAttribute && src.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(src.classList && src.classList.contains('active')) return true;
    var v = (src.value || src.textContent || '').trim();
    return isYes(v);
  }
  function sync(){
    var src = getSrc();
    var yes = srcIsOn(src);
    var v = yes ? 'Oui' : 'Non';
    ['allerRetour','ar'].forEach(function(id){
      var m = ensureMirror(id);
      m.value = v;
      // notify listeners
      ['input','change'].forEach(function(evt){
        try { m.dispatchEvent(new Event(evt, {bubbles:true})); } catch(e){}
      });
    });
    window.__force_AR = yes;
  }

  // Public safety net for any global caller
  window.roundTripOn = function(){
    var src = getSrc();
    if(src) return srcIsOn(src);
    var m = document.getElementById('allerRetour') || document.getElementById('ar');
    return !!(m && isYes(m.value));
  };

  function hook(){
    var src = getSrc();
    if(!src) return;
    ['change','input','click','keyup'].forEach(function(evt){
      src.addEventListener(evt, sync, true);
    });
    // initial sync
    sync();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', hook);
  } else {
    hook();
  }
})();
