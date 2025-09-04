
/* TaxiLI — TOP WhatsApp SIMPLE CHAT (HARD ISOLATION)
   - Ensures the TOP WhatsApp button always opens YOUR chat with a fixed greeting.
   - Breaks any previous event handlers by cloning the node.
   - Prevents default and navigates directly to wa.me/<NUMBER>?text=...
*/
(function(){
  if (window.__WA_TOP_SIMPLE_HARD__) return; window.__WA_TOP_SIMPLE_HARD__=true;

  var NUMBER = "590691280005"; // <-- put your number here (no +, digits only)
  var GREETING = "Bonjour, besoin d'un renseignement";

  function getTopButton(){
    // prefer explicit id if present
    var a = document.getElementById('waTopSimple');
    if(a) return a;
    // then by data flag
    a = document.querySelector('a[data-plain-wa="true"], button[data-plain-wa="true"]');
    if(a) return a;
    // then by visible text "WhatsApp" near top header
    var cand = Array.from(document.querySelectorAll('a,button')).filter(function(n){
      var t = (n.innerText||n.textContent||'').trim().toLowerCase();
      return t.includes('whatsapp');
    });
    return cand.length ? cand[0] : null;
  }

  function buildUrl(){
    var txt = encodeURIComponent(GREETING);
    return "https://wa.me/" + NUMBER + "?text=" + txt;
  }

  function isolate(a){
    // clone to drop any existing listeners/bindings
    var clone = a.cloneNode(true);
    clone.id = 'waTopSimple'; // normalize
    clone.setAttribute('data-plain-wa','true');
    clone.setAttribute('href', buildUrl());
    clone.setAttribute('target','_blank');
    clone.setAttribute('rel','noopener');
    a.parentNode && a.parentNode.replaceChild(clone, a);
    return clone;
  }

  function attach(a){
    var url = buildUrl();
    function go(e){
      // stop all other handlers and default, then navigate to our URL
      try{ e.preventDefault(); }catch(err){}
      try{ e.stopPropagation(); }catch(err){}
      try{ e.stopImmediatePropagation(); }catch(err){}
      try{ window.location.href = url; }catch(err){}
    }
    ['click','pointerdown','touchstart'].forEach(function(evt){
      a.addEventListener(evt, go, true);
      a.addEventListener(evt, go, false);
    });
  }

  function init(){
    var a = getTopButton();
    if(!a) return;
    a = isolate(a);
    attach(a);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
