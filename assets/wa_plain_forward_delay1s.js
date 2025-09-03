
/* TaxiLI — WA PLAIN FORWARD + 1s preview of estimation
   - On WhatsApp button click: highlight/show estimation for 1 second, then proceed to send message (no calculation)
*/
(function(){
  if (window.__WA_DELAY_PREVIEW__) return; window.__WA_DELAY_PREVIEW__=true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }

  function getEstimateNode(){
    return $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
  }

  function showPreview(){
    var est = getEstimateNode();
    if(!est) return;
    // Add a temporary pulse/highlight
    est.classList.add('taxili-pulse');
    // Create a small toast
    var val = tv(est) || "(indisponible)";
    var toast = document.createElement('div');
    toast.className = 'taxili-toast';
    toast.textContent = 'Estimation: ' + val;
    document.body.appendChild(toast);
    setTimeout(function(){
      est.classList.remove('taxili-pulse');
      if(toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 1000);
  }

  function buildMessageFromForm(){
    // Reuse the same logic from wa_plain_forward.js if present
    if (typeof window.__WA_PLAIN_FORWARD_BUILD__ === 'function'){
      try { return window.__WA_PLAIN_FORWARD_BUILD__(); } catch(e){}
    }
    // Fallback minimal build (safe)
    var L = [];
    L.push("Bonjour Taxi Li, je souhaite réserver une course.");
    L.push("Nouvelle réservation Taxi Li 🚕");
    var pairs = [
      ['Nom', tv($('#name')||$('#nom')||document.querySelector('input[autocomplete="name"],input[name="name"]'))],
      ['Téléphone', tv($('#phone')||$('#tel')||document.querySelector('input[type="tel"]'))],
      ['Départ', tv($('#start')||$('#depart')||$('#origin'))],
      ['Destination', tv($('#end')||$('#dest')||$('#destination'))],
      ['Date', tv($('#date')||document.querySelector('input[type="date"]'))],
      ['Heure', tv($('#time')||document.querySelector('input[type="time"]'))],
      ['Estimation', tv(getEstimateNode())]
    ];
    pairs.forEach(function(p){ if(p[1]) L.push(p[0]+": "+p[1]); });
    L.push("—"); L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  function isWATrigger(el){
    if(!el) return false;
    var node = el.closest && el.closest('a,button');
    if(!node) return false;
    var label = (node.innerText||node.textContent||'').toLowerCase();
    if(label.includes('réserver par whatsapp') || label.includes('reserver par whatsapp')) return true;
    var href = (node.getAttribute && node.getAttribute('href')) || '';
    if(/wa\.me|whatsapp/i.test(href)) return true;
    return false;
  }

  function onClick(e){
    var trg = e.target;
    if(!trg || !isWATrigger(trg)) return;
    e.preventDefault();
    e.stopPropagation();
    try{ e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(err){}

    // 1) Show preview for 1s (no calculation here)
    showPreview();

    // 2) After 1s, build message & navigate
    setTimeout(function(){
      var msg;
      // If wa_plain_forward exposed a builder, use it for full form capture
      if(typeof window.__WA_PLAIN_FORWARD_BUILD__ === 'function'){
        try { msg = window.__WA_PLAIN_FORWARD_BUILD__(); } catch(e){}
      }
      if(!msg){ msg = buildMessageFromForm(); }

      var base = 'https://wa.me/590691280005';
      var waA = document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
      if(waA){
        var href = waA.getAttribute('href')||'';
        var m = href.match(/wa\.me\/(\d+)/);
        if(m) base = 'https://wa.me/' + m[1];
      }
      var url = base + '?text=' + encodeURIComponent(msg);
      window.location.href = url;
    }, 1000);
  }

  ['click','pointerdown','touchstart'].forEach(function(evt){
    document.addEventListener(evt, onClick, true);
    window.addEventListener(evt, onClick, true);
  });

  // Inject minimal CSS for pulse & toast
  var css = document.createElement('style');
  css.textContent = [
    '.taxili-pulse{ outline: 2px solid rgba(0,0,0,.2); box-shadow: 0 0 0 6px rgba(0,0,0,.1); transition: box-shadow .2s ease; }',
    '.taxili-toast{ position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);',
    ' background: #111; color:#fff; padding:10px 14px; border-radius:8px; font-family: system-ui, sans-serif;',
    ' font-size:14px; z-index: 99999; opacity: 0.95; }'
  ].join('');
  document.head.appendChild(css);

  // Expose a builder hook so delay script can reuse the full form capture
  if(!window.__WA_PLAIN_FORWARD_BUILD__){
    // If the original wa_plain_forward.js defined buildMessage() in closure only,
    // we can't access it; but if it exposed a hook, keep ours as fallback.
    window.__WA_PLAIN_FORWARD_BUILD__ = null;
  }
})();
