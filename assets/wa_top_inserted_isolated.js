
/* TaxiLI — Inserted & Isolated TOP WhatsApp (green)
   - Injects a NEW green WA button between the phone "0691280005" and the "Réserver" button
   - Hides any existing green WA in header
   - Absolute isolation: prevents any other script from changing its behavior
*/
(function(){
  if (window.__WA_TOP_INSERTED_ISOLATED__) return; window.__WA_TOP_INSERTED_ISOLATED__=true;

  var NUMBER   = "590691280005"; // your WhatsApp number (digits only)
  var GREETING = "Bonjour, besoin d'un renseignement";
  var URL      = "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent(GREETING);

  function findHeader(){
    // try common header containers
    return document.querySelector('header, .header, .topbar, .navbar, .nav, .site-header') || document.body;
  }

  function findPhoneNode(root){
    var a = Array.from(root.querySelectorAll('a,span,div,button')).find(function(n){
      var t = (n.innerText||n.textContent||'').replace(/\s/g,'').trim();
      return /0691280005/.test(t);
    });
    return a;
  }

  function findReserveNode(root){
    var a = Array.from(root.querySelectorAll('a,button')).find(function(n){
      var t = (n.innerText||n.textContent||'').toLowerCase();
      return /\br[ée]server\b/.test(t) && !/whatsapp/i.test(t);
    });
    return a;
  }

  function hideExistingWA(root){
    Array.from(root.querySelectorAll('a,button')).forEach(function(n){
      var t = (n.innerText||n.textContent||'').toLowerCase();
      var href = (n.getAttribute && n.getAttribute('href')) || '';
      if(t.includes('whatsapp') || /wa\.me|whatsapp/.test(href)){
        n.style.display='none';
        n.setAttribute('data-wa-hidden','true');
      }
    });
  }

  function makeButton(){
    var a = document.createElement('a');
    a.id = 'waTopIso';
    a.className = 'btn-wa-green';
    a.href = URL;
    a.setAttribute('target','_blank');
    a.setAttribute('rel','noopener');
    a.textContent = 'WhatsApp';
    return a;
  }

  function insertBetween(root){
    var phone = findPhoneNode(root);
    var reserve = findReserveNode(root);
    var btn = makeButton();
    if(phone && phone.parentNode){
      if(reserve && reserve.parentNode === phone.parentNode){
        // same container → insert before reserve
        phone.parentNode.insertBefore(btn, reserve);
      }else{
        // insert right after phone
        phone.parentNode.insertBefore(btn, phone.nextSibling);
      }
    }else if(reserve && reserve.parentNode){
      reserve.parentNode.insertBefore(btn, reserve);
    }else{
      // fallback → prepend to header
      root.insertBefore(btn, root.firstChild);
    }
    return btn;
  }

  function isolate(btn){
    var url = URL;
    function go(e){
      try{ e.preventDefault(); }catch(e){}
      try{ e.stopImmediatePropagation(); }catch(e){}
      try{ e.stopPropagation(); }catch(e){}
      try{ window.location.href = url; }catch(e){}
    }
    ['click','pointerdown','touchstart'].forEach(function(evt){
      btn.addEventListener(evt, go, true);
      btn.addEventListener(evt, go, false);
    });
  }

  function style(){
    if(document.getElementById('waIsoCSS')) return;
    var css = document.createElement('style');
    css.id = 'waIsoCSS';
    css.textContent = `
      .btn-wa-green{
        display:inline-block; margin:0 8px; padding:8px 12px; border-radius:20px;
        background:#25D366; color:#fff; text-decoration:none; font-weight:600;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; font-size:14px;
        box-shadow:0 4px 12px rgba(0,0,0,.15);
      }
      .btn-wa-green:hover{ opacity:.95; }
      @media (max-width:520px){
        .btn-wa-green{ padding:7px 10px; font-size:13px; margin:0 6px; }
      }
    `;
    document.head.appendChild(css);
  }

  function init(){
    var header = findHeader();
    hideExistingWA(header);
    style();
    var btn = insertBetween(header);
    isolate(btn);
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
