
/* TaxiLI — TOP WhatsApp simple chat only
   This ensures the TOP WhatsApp button opens YOUR chat only,
   with a short greeting, and is NOT modified by other scripts.
*/
(function(){
  if (window.__WA_TOP_SIMPLE_ONLY__) return; window.__WA_TOP_SIMPLE_ONLY__ = true;

  var WA_URL = 'https://wa.me/590691280005?text=Bonjour%2C%20besoin%20d%27un%20renseignement';

  function init(){
    var a = document.getElementById('waTopSimple');
    if(!a){
      // try to find any element explicitly marked
      a = document.querySelector('[data-plain-wa="true"]');
    }
    if(!a) return;

    a.setAttribute('href', WA_URL);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');

    function handler(e){
      // Let default navigation happen, but block *other* JS handlers
      try{ e.stopImmediatePropagation(); }catch(err){}
      try{ e.stopPropagation(); }catch(err){}
      // Do NOT preventDefault -> the link opens naturally
      // As a safety, force nav right away too
      try{ window.location.href = WA_URL; }catch(err){}
    }

    ['click','pointerdown','touchstart'].forEach(function(evt){
      a.addEventListener(evt, handler, true);  // capture to run before others
      a.addEventListener(evt, handler, false); // and bubble to suppress others
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
