
/* TaxiLI – Patch WhatsApp/Email to include 'Notes utiles' and force estimation at send time.
   Drop-in: include this file at the very end of <body> AFTER your other scripts.
*/
(function(){
  if (window.__WA_NOTES_PATCH__) return;
  window.__WA_NOTES_PATCH__ = true;

  function $(sel){ return document.querySelector(sel); }
  function v(el){ return (el && (el.value || el.textContent) || '').trim(); }

  // Robust getters (multiple IDs/names)
  function getField(){
    const obj = {};
    obj.name  = v($('#name'))  || v($('#nom'))  || v(document.querySelector('input[autocomplete="name"]')) || v(document.querySelector('input[name="name"]'));
    obj.phone = v($('#phone')) || v($('#tel'))  || v(document.querySelector('input[type="tel"]'));
    obj.date  = v($('#date'))  || v(document.querySelector('input[type="date"]'));
    obj.time  = v($('#time'))  || v(document.querySelector('input[type="time"]'));
    obj.start = v($('#start')) || v($('#depart')) || v($('#origin'));
    obj.end   = v($('#end'))   || v($('#dest'))   || v($('#destination'));
    obj.notes = v($('#notes')) || v(document.querySelector('textarea[name="notes"]')) ||
                v(document.querySelector('textarea[placeholder*="note" i]')) ||
                v(document.querySelector('textarea'));
    // Aller/retour
    const rtEl = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
    const rtVal = (rtEl && (rtEl.value || rtEl.textContent)) || '';
    obj.roundtrip = /oui/i.test(rtVal) ? 'Oui' : 'Non';
    return obj;
  }

  function formatEUR(n){
    if(typeof n!=='number' || !isFinite(n)) return '';
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  async function getEstimate(){
    // Prefer a real compute function if available
    try {
      if (typeof window.computeEstimate === 'function') {
        const p = window.computeEstimate();
        const val = (p && typeof p.then==='function') ? await p : p;
        if (typeof val === 'number' && isFinite(val)) return val;
      }
    } catch(e){}
    // Fallback: read #estimateOut
    const out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if (out){
      const ds = out.dataset && out.dataset.value ? parseFloat(String(out.dataset.value).replace(',','.')) : NaN;
      if (isFinite(ds)) return ds;
      const txt = (out.textContent||'').replace(/[^\d.,]/g,'').replace(',','.');
      const n = parseFloat(txt);
      if (isFinite(n)) return n;
    }
    return NaN;
  }

  function buildMessage(price){
    const f = getField();
    const L = [];
    L.push("Nouvelle réservation Taxi LI 🚕");
    if (f.name)  L.push("Nom: " + f.name);
    if (f.phone) L.push("Téléphone: " + f.phone);
    if (f.date)  L.push("Date: " + f.date);
    if (f.time)  L.push("Heure: " + f.time);
    if (f.start) L.push("Départ: " + f.start);
    if (f.end)   L.push("Destination: " + f.end);
    L.push("Aller/retour: " + f.roundtrip);
    if (f.notes) L.push("Notes: " + f.notes); // <— ALWAYS include notes if present
    L.push("Estimation: " + (isFinite(price) ? formatEUR(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  async function handleSend(e){
    const a = e.target && e.target.closest && e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href') || '';
    const isWA   = /wa\.me|whatsapp/i.test(href);
    const isMail = /^mailto:/i.test(href);
    if(!isWA && !isMail) return;

    // Always compute/refresh estimation right now, if possible
    e.preventDefault();

    let price = NaN;
    try { price = await getEstimate(); } catch(e){}

    const msg = buildMessage(price);
    if (isWA){
      const base = href.split('?')[0];
      const sep  = href.includes('?') ? '&' : '?';
      a.setAttribute('href', base + sep + 'text=' + encodeURIComponent(msg));
    } else if (isMail){
      const parts = href.split('?');
      const mailto = parts[0];
      const params = new URLSearchParams(parts[1]||'');
      if(!params.has('subject')) params.set('subject','Demande de réservation taxi');
      params.set('body', msg);
      a.setAttribute('href', mailto + '?' + params.toString());
    }
    // Continue with updated link
    window.location.href = a.getAttribute('href');
  }

  ['click','pointerdown','touchstart'].forEach(evt => {
    document.addEventListener(evt, handleSend, true); // capture phase
    window.addEventListener(evt, handleSend, true);
  });
})();
