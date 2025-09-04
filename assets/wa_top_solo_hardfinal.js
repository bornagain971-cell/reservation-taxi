
/* TaxiLI — TOP WhatsApp SOLO (Hard Final)
   - Button placed STRICTLY between phone badge and "Réserver"
   - No 'WhatsApp' word in innerText; label shown via CSS ::after
   - <button> element (not <a>); no href to rewrite
   - Capture-level isolation; opens wa.me/<NUMBER>?text=...
*/
(function(){
  if (window.__WA_SOLO_HARD_FINAL__) return; window.__WA_SOLO_HARD_FINAL__ = true;

  var NUMBER   = "590691280005"; // ← ton numéro (chiffres uniquement)
  var GREETING = "Bonjour, besoin d'un renseignement";
  var URL      = "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent(GREETING);

  function txt(n){ return (n && (n.innerText||n.textContent)||'').trim(); }

  function headerRoot(){
    var nodes = document.querySelectorAll('header, .header, .topbar, .navbar, .site-header, .container, .wrapper');
    for (var i=0;i<nodes.length;i++){
      var el = nodes[i];
      var t = (el.innerText||'').replace(/\s+/g,' ');
      if(/0691\s*28\s*00\s*05/.test(t) && /[rR][ée]server/.test(t)) return el;
    }
    return document.body;
  }
  function findPhone(root){
    return Array.from(root.querySelectorAll('a,button,span,div')).find(function(n){
      return /0691\s*28\s*00\s*05/.test((n.innerText||'').replace(/\s+/g,' '));
    });
  }
  function findReserve(root){
    return Array.from(root.querySelectorAll('a,button')).find(function(n){
      var t=txt(n).toLowerCase(); return /\br[ée]server\b/.test(t) && !/whatsapp/.test(t);
    });
  }

  function removeOtherHeaderWA(root){
    Array.from(document.querySelectorAll('a,button')).forEach(function(n){
      var label = txt(n).toLowerCase();
      var href  = (n.getAttribute && n.getAttribute('href')) || '';
      var isWA  = label.includes('whatsapp') || /wa\.me|whatsapp/i.test(href);
      if(!isWA) return;
      if(n.closest('form, .reservation, .booking, #reservation')) return; // keep form buttons
      if(n.id === 'waSolo') return;
      n.parentNode && n.parentNode.removeChild(n);
    });
  }

  function ensureCSS(){
    if(document.getElementById('waSoloCSS')) return;
    var css = document.createElement('style');
    css.id = 'waSoloCSS';
    css.textContent = `
      /* Keep original layout: do NOT touch parent containers */
      #waSolo{
        position:relative;
        display:inline-flex; align-items:center; justify-content:center;
        background:#25D366; color:#fff;
        font-weight:700; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
        font-size:13px; line-height:1; padding:8px 12px;
        border-radius:18px; border:0; cursor:pointer; white-space:nowrap;
        box-shadow:0 6px 18px rgba(0,0,0,.18);
      }
      #waSolo > .txt{ visibility:hidden; height:0; overflow:hidden; } /* no 'WhatsApp' in DOM text */
      #waSolo::before{
        content:""; width:14px; height:14px; margin-right:0px; display:inline-block;
        background:currentColor; -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox=\\'0 0 32 32\\'><path fill=\\'white\\' d=\\'M16.01 3C9.37 3 4 8.37 4 15.01c0 2.11.55 4.09 1.51 5.82L4 29l8.36-1.46a11.96 11.96 0 0 0 3.65.57C22.64 28.11 28 22.74 28 16.1 28.01 9.37 22.64 3 16.01 3zm7.11 17.36c-.3.85-1.47 1.36-2.03 1.39-.54.03-1.2.04-1.93-.12-.44-.1-1-.33-1.72-.65-3.03-1.31-5-4.35-5.16-4.56-.15-.2-1.23-1.64-1.23-3.13 0-1.48.75-2.21 1.02-2.51.28-.3.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.69.52.26.62.88 2.14.96 2.29.08.15.13.33.02.53-.11.2-.17.33-.34.51-.17.19-.36.42-.52.57-.17.15-.35.31-.15.61.2.3.9 1.48 1.94 2.4 1.33 1.19 2.45 1.56 2.76 1.72.31.16.49.13.68-.08.19-.2.78-.9.99-1.21.21-.3.42-.26.69-.15.28.1 1.77.84 2.07.99.3.15.5.23.58.36.07.13.07.78-.23 1.63z\\'/></svg>') no-repeat 50% 50% / contain;
                mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox=\\'0 0 32 32\\'><path fill=\\'black\\' d=\\'M16.01 3C9.37 3 4 8.37 4 15.01c0 2.11.55 4.09 1.51 5.82L4 29l8.36-1.46a11.96 11.96 0 0 0 3.65.57C22.64 28.11 28 22.74 28 16.1 28.01 9.37 22.64 3 16.01 3zm7.11 17.36c-.3.85-1.47 1.36-2.03 1.39-.54.03-1.2.04-1.93-.12-.44-.1-1-.33-1.72-.65-3.03-1.31-5-4.35-5.16-4.56-.15-.2-1.23-1.64-1.23-3.13 0-1.48.75-2.21 1.02-2.51.28-.3.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.69.52.26.62.88 2.14.96 2.29.08.15.13.33.02.53-.11.2-.17.33-.34.51-.17.19-.36.42-.52.57-.17.15-.35.31-.15.61.2.3.9 1.48 1.94 2.4 1.33 1.19 2.45 1.56 2.76 1.72.31.16.49.13.68-.08.19-.2.78-.9.99-1.21.21-.3.42-.26.69-.15.28.1 1.77.84 2.07.99.3.15.5.23.58.36.07.13.07.78-.23 1.63z\\'/></svg>') no-repeat 50% 50% / contain;
      }
      #waSolo::after{ content:"WhatsApp"; }
      #waSolo:hover{ filter:brightness(.98); }
      #waSolo:active{ transform:translateY(1px); }
    `;
    document.head.appendChild(css);
  }

  function buildButton(reference){
    var b = document.createElement('button');
    b.id = 'waSolo';
    b.type = 'button';
    // Copy classes from "Réserver" for identical shape/spacing
    if(reference && reference.className){ b.className = reference.className; }
    // Force green + white text only for this button
    b.style.background = '#25D366'; b.style.color = '#fff';
    // Minimal inner text that avoids the word "WhatsApp"
    b.innerHTML = '<span class="txt">WA</span>';
    return b;
  }

  function insertBetween(){
    var root = headerRoot();
    var phone = findPhone(root);
    var reserve = findReserve(root);
    if(!phone || !reserve || !reserve.parentNode) return;

    // Remove any existing WA in header/hero
    removeOtherHeaderWA(root);

    // If an old #waSolo exists, remove it to avoid duplicates
    var old = document.getElementById('waSolo');
    if(old && old.parentNode) old.parentNode.removeChild(old);

    var btn = buildButton(reserve);
    reserve.parentNode.insertBefore(btn, reserve);

    function go(e){
      try{ e.preventDefault(); }catch(_){}
      try{ e.stopImmediatePropagation(); }catch(_){}
      try{ e.stopPropagation(); }catch(_){}
      try{ window.open(URL, '_blank', 'noopener'); }catch(err){ try{ window.location.href = URL; }catch(__){} }
    }
    // Capture-level isolation on button itself and on document
    ['click','pointerdown','touchstart'].forEach(function(evt){
      btn.addEventListener(evt, go, true);
      document.addEventListener(evt, function(ev){
        if(ev.target===btn || (btn.contains && btn.contains(ev.target))){ go(ev); }
      }, true);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ ensureCSS(); insertBetween(); });
  } else {
    ensureCSS(); insertBetween();
  }
})();
