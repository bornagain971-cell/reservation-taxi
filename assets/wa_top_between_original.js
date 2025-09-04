
/* TaxiLI — WhatsApp button BETWEEN (original layout preserved)
   - No layout/CSS overrides: we do NOT change parent display/flow
   - Clone "Réserver" button classes to match black pill style exactly
   - Insert the new button strictly BETWEEN the phone badge and "Réserver"
   - Remove other header/hero WhatsApp pills to avoid duplicates
*/
(function(){
  if (window.__WA_BETWEEN_ORIGINAL__) return; window.__WA_BETWEEN_ORIGINAL__ = true;

  var NUMBER   = "590691280005"; // digits only
  var GREETING = "Bonjour, besoin d'un renseignement";
  var URL      = "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent(GREETING);

  function text(n){ return (n && (n.innerText||n.textContent)||'').trim(); }

  function rootHeader(){
    // look for a container that clearly contains both phone and "Réserver"
    var nodes = document.querySelectorAll('header, .header, .top, .topbar, .navbar, .site-header, .container, .wrapper');
    for (var i=0;i<nodes.length;i++){
      var el = nodes[i];
      var t = (el.innerText||'').replace(/\s+/g,' ');
      if(/0691\s*28\s*00\s*05/.test(t) && /[rR][ée]server/.test(t)) return el;
    }
    return document.body;
  }

  function findPhone(root){
    var nodes = Array.from(root.querySelectorAll('a,span,div,button'));
    return nodes.find(function(n){
      return /0691\s*28\s*00\s*05/.test((n.innerText||'').replace(/\s+/g,' '));
    });
  }
  function findReserve(root){
    var nodes = Array.from(root.querySelectorAll('a,button'));
    return nodes.find(function(n){
      var t = text(n).toLowerCase();
      return /\br[ée]server\b/.test(t) && !/whatsapp/.test(t);
    });
  }

  function removeOtherHeaderWA(root){
    Array.from(root.querySelectorAll('a,button')).forEach(function(n){
      var t = text(n).toLowerCase();
      var href = (n.getAttribute && n.getAttribute('href')) || '';
      var isWA = t.includes('whatsapp') || /wa\.me|whatsapp/i.test(href);
      if(!isWA) return;
      // skip if it's inside the reservation form area
      if(n.closest('form, .reservation, .booking, #reservation')) return;
      // we'll add our own between, so remove any header/hero WA
      if(n.parentNode) n.parentNode.removeChild(n);
    });
  }

  function makeBlackWAButton(referenceButton){
    var a = document.createElement('a'); // use <a> like your other buttons
    a.id = 'waHeaderBlack';
    // Copy classes from the "Réserver" button for perfect match
    if(referenceButton && referenceButton.className){
      a.className = referenceButton.className;
    } else {
      // safe defaults (rounded black pill)
      a.style.background = '#111';
      a.style.color = '#fff';
      a.style.padding = '10px 16px';
      a.style.borderRadius = '24px';
      a.style.textDecoration = 'none';
      a.style.display = 'inline-block';
      a.style.fontWeight = '700';
    }
    // Add icon + label (icon is white via currentColor)
    a.innerHTML = '<span class="wa-ico" aria-hidden="true" style="display:inline-flex;vertical-align:middle;margin-right:8px;"><svg width="16" height="16" viewBox="0 0 32 32"><path fill="currentColor" d="M16.01 3C9.37 3 4 8.37 4 15.01c0 2.11.55 4.09 1.51 5.82L4 29l8.36-1.46a11.96 11.96 0 0 0 3.65.57C22.64 28.11 28 22.74 28 16.1 28.01 9.37 22.64 3 16.01 3zm7.11 17.36c-.3.85-1.47 1.36-2.03 1.39-.54.03-1.2.04-1.93-.12-.44-.1-1-.33-1.72-.65-3.03-1.31-5-4.35-5.16-4.56-.15-.2-1.23-1.64-1.23-3.13 0-1.48.75-2.21 1.02-2.51.28-.3.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.69.52.26.62.88 2.14.96 2.29.08.15.13.33.02.53-.11.2-.17.33-.34.51-.17.19-.36.42-.52.57-.17.15-.35.31-.15.61.2.3.9 1.48 1.94 2.4 1.33 1.19 2.45 1.56 2.76 1.72.31.16.49.13.68-.08.19-.2.78-.9.99-1.21.21-.3.42-.26.69-.15.28.1 1.77.84 2.07.99.3.15.5.23.58.36.07.13.07.78-.23 1.63z"/></svg></span><span>WhatsApp</span>';
    a.href = URL;
    a.target = '_blank';
    a.rel = 'noopener';
    // Isolation: force direct WA and block any other handler
    function go(e){
      try{ e.preventDefault(); }catch(_){}
      try{ e.stopImmediatePropagation(); }catch(_){}
      try{ e.stopPropagation(); }catch(_){}
      try{ window.location.href = URL; }catch(_){}
    }
    ['click','pointerdown','touchstart'].forEach(function(evt){ a.addEventListener(evt, go, true); });
    return a;
  }

  function insertBetween(){
    var header = rootHeader();
    var phone = findPhone(header);
    var reserve = findReserve(header);
    if(!reserve || !phone) return; // nothing to do safely

    removeOtherHeaderWA(header);

    var waBtn = makeBlackWAButton(reserve);
    // Insert strictly BEFORE "Réserver" so it sits BETWEEN phone and "Réserver"
    try{
      reserve.parentNode.insertBefore(waBtn, reserve);
    }catch(e){
      // fallback: after phone
      phone.parentNode && phone.parentNode.insertBefore(waBtn, phone.nextSibling);
    }
  }

  // Run after DOM is ready
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', insertBetween);
  } else {
    insertBetween();
  }
})();
