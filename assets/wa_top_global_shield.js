
/* TaxiLI — TOP WA GLOBAL SHIELD
   Absolute isolation for the TOP WhatsApp button.
   Any click on #waTopSimple opens YOUR wa.me link with greeting,
   and NO other handler on the page can hijack it.
*/
(function(){
  if (window.__WA_TOP_GLOBAL_SHIELD__) return; window.__WA_TOP_GLOBAL_SHIELD__ = true;

  var NUMBER   = "590691280005"; // << your number (digits only)
  var GREETING = "Bonjour, besoin d'un renseignement";
  var URL      = "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent(GREETING);

  // Tell any of our previous scripts to ignore this node entirely
  window.__IGNORE_WA_NODE__ = function(node){
    try{ return !!(node && (node.closest('#waTopSimple,[data-wa-solo="true"]'))); }catch(e){ return false; }
  };

  function nav(){
    try{ window.location.href = URL; }catch(e){}
  }

  function ensureLink(){
    var a = document.getElementById('waTopSimple') || document.querySelector('[data-wa-solo="true"]');
    if(!a) return null;
    a.setAttribute('href', URL);
    a.setAttribute('target','_blank');
    a.setAttribute('rel','noopener');
    return a;
  }

  function onCapture(e){
    var a = document.getElementById('waTopSimple') || document.querySelector('[data-wa-solo="true"]');
    if(!a) return;
    var inside = false;
    try{ inside = !!(e.target && (e.target===a || a.contains(e.target))); }catch(err){}
    if(!inside) return;

    // Kill EVERY other handler and default, then navigate
    try{ e.preventDefault(); }catch(err){}
    try{ e.stopImmediatePropagation(); }catch(err){}
    try{ e.stopPropagation(); }catch(err){}
    nav();
  }

  function init(){
    ensureLink();
    // Use capture at the topmost level so this runs BEFORE any other interceptors
    ['click','pointerdown','touchstart'].forEach(function(evt){
      document.addEventListener(evt, onCapture, true);
      window.addEventListener(evt, onCapture, true);
    });
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
