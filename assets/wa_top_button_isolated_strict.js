
/* TaxiLI — TOP "WhatsApp" button ISOLATED (strict)
   - Renders a <button> (not <a>) inserted between phone badge and "Réserver"
   - Inner text is "WA" (so other scripts that search for "whatsapp" won't match)
   - CSS ::after displays "WhatsApp" visually
   - Capture-level handler blocks ALL other listeners and opens wa.me/<number>?text=...
*/
(function(){
  if (window.__WA_TOP_STRICT__) return; window.__WA_TOP_STRICT__ = true;

  var NUMBER   = "590691280005"; // your number (digits only)
  var GREETING = "Bonjour, besoin d'un renseignement";
  var URL      = "https://wa.me/" + NUMBER + "?text=" + encodeURIComponent(GREETING);

  function headerRoot(){
    return document.querySelector('header, .header, .topbar, .navbar, .nav, .site-header') || document.body;
  }
  function findPhoneNode(root){
    return Array.from(root.querySelectorAll('a,span,div,button')).find(function(n){
      var t = (n.innerText||n.textContent||'').replace(/\s/g,'').trim();
      return /0691280005/.test(t);
    });
  }
  function findReserveNode(root){
    return Array.from(root.querySelectorAll('a,button')).find(function(n){
      var t = (n.innerText||n.textContent||'').toLowerCase();
      return /\br[ée]server\b/.test(t) && !/whatsapp/i.test(t);
    });
  }
  function hideOldWA(root){
    Array.from(root.querySelectorAll('a,button')).forEach(function(n){
      var t = (n.innerText||n.textContent||'').toLowerCase();
      var href = (n.getAttribute && n.getAttribute('href')) || '';
      if(t.includes('whatsapp') || /wa\.me|whatsapp/.test(href)){
        n.setAttribute('data-wa-hidden','true');
        n.style.display = 'none';
      }
    });
  }

  function css(){
    if(document.getElementById('waStrictCSS')) return;
    var s = document.createElement('style');
    s.id = 'waStrictCSS';
    s.textContent = `
      #waIsoBtn{display:inline-block; margin:0 8px; padding:8px 12px; border-radius:20px;
        background:#25D366; color:#fff; font-weight:600; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
        font-size:14px; border:0; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.15); position:relative;}
      #waIsoBtn span{visibility:hidden;} /* inner text "WA" hidden */
      #waIsoBtn::after{content:"WhatsApp"; position:absolute; left:12px; right:12px; top:50%; transform:translateY(-50%); text-align:center; visibility:visible;}
      #waIsoBtn:hover{opacity:.95;}
      @media (max-width:520px){ #waIsoBtn{ padding:7px 10px; font-size:13px; margin:0 6px; } }
    `;
    document.head.appendChild(s);
  }

  function insertButton(){
    var root = headerRoot();
    var phone = findPhoneNode(root);
    var reserve = findReserveNode(root);
    var btn = document.createElement('button');
    btn.id = 'waIsoBtn';
    btn.type = 'button';
    btn.setAttribute('data-no-reserve','true'); // hint for other scripts to ignore
    btn.innerHTML = '<span>WA</span>';
    if(phone && phone.parentNode){
      if(reserve && reserve.parentNode === phone.parentNode){
        phone.parentNode.insertBefore(btn, reserve);
      } else {
        phone.parentNode.insertBefore(btn, phone.nextSibling);
      }
    } else if(reserve && reserve.parentNode){
      reserve.parentNode.insertBefore(btn, reserve);
    } else {
      root.insertBefore(btn, root.firstChild);
    }
    return btn;
  }

  function attach(btn){
    function go(e){
      try{ e.preventDefault(); }catch(e){}
      try{ e.stopImmediatePropagation(); }catch(e){}
      try{ e.stopPropagation(); }catch(e){}
      // Use window.open to bypass some SPA routers
      try{ window.open(URL, '_blank', 'noopener'); }catch(e){ try{ window.location.href = URL; }catch(_){} }
    }
    // capture-level listeners on the button AND document
    ['click','pointerdown','touchstart'].forEach(function(evt){
      btn.addEventListener(evt, go, true);
      document.addEventListener(evt, function(ev){
        if(ev.target===btn || btn.contains(ev.target)){
          go(ev);
        }
      }, true);
    });
  }

  function init(){
    css();
    hideOldWA(headerRoot());
    var btn = insertButton();
    attach(btn);
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();
