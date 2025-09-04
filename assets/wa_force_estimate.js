
/* TaxiLI — Force compute estimate on "Réserver par WhatsApp" before opening WA */
(function(){
  if (window.__WA_FORCE__) return; window.__WA_FORCE__ = true;
  function $(sel){ return document.querySelector(sel); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function formatEUR(n){ return n.toFixed(2).replace('.',',')+' €'; }

  async function getEstimate(){
    try{
      if(typeof window.computeEstimate === 'function'){
        const v = window.computeEstimate();
        return (v && typeof v.then === 'function') ? await v : v;
      }
    }catch(e){}
    const out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out){
      if(out.dataset && out.dataset.value){
        const n = parseFloat(String(out.dataset.value).replace(',','.'));
        if(isFinite(n)) return n;
      }
      const m = (tv(out).match(/(\d+[.,]\d+)/)||[])[1];
      if(m){
        const n = parseFloat(String(m).replace(',','.'));
        if(isFinite(n)) return n;
      }
    }
    return NaN;
  }

  function buildMessage(price){
    const L = [];
    L.push("Nouvelle réservation Taxi LI 🚕");
    const name  = tv($('#name')) || tv($('#nom')) || tv(document.querySelector('input[autocomplete=\"name\"]')) || tv(document.querySelector('input[name=\"name\"]'));
    const tel   = tv($('#phone'))|| tv($('#tel')) || tv(document.querySelector('input[type=\"tel\"]'));
    const date  = tv($('#date')) || tv(document.querySelector('input[type=\"date\"]'));
    const time  = tv($('#time')) || tv(document.querySelector('input[type=\"time\"]'));
    const dep   = tv($('#start'))|| tv($('#depart'))|| tv($('#origin'));
    const dst   = tv($('#end'))  || tv($('#dest'))  || tv($('#destination'));
    const notes = tv($('#notes'))|| tv(document.querySelector('textarea[name=\"notes\"]')) || tv(document.querySelector('textarea[placeholder*=\"note\" i]'));
    if(name) L.push("Nom: " + name);
    if(tel)  L.push("Téléphone: " + tel);
    if(date) L.push("Date: " + date);
    if(time) L.push("Heure: " + time);
    if(dep)  L.push("Départ: " + dep);
    if(dst)  L.push("Destination: " + dst);
    const rtEl = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name=\"roundtrip\"]');
    const rtV  = (rtEl && (rtEl.value||rtEl.textContent)||''); 
    L.push("Aller/retour: " + (/oui/i.test(rtV) ? "Oui" : "Non"));
    if(notes) L.push("Notes utiles: " + notes);
    L.push("Estimation: " + (isFinite(price) ? formatEUR(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\\n");
  }

  async function maybeHandleWA(e){
    const a = e.target && e.target.closest && e.target.closest('a[href*=\"wa.me\"], a[href*=\"whatsapp\"]');
    if(!a) return;
    e.preventDefault();
    let price = NaN;
    try { price = await getEstimate(); } catch(e){}
    const msg = buildMessage(price);
    const href = a.getAttribute('href') || 'https://wa.me/';
    const base = href.split('?')[0];
    const sep  = href.includes('?') ? '&' : '?';
    const updated = base + sep + 'text=' + encodeURIComponent(msg);
    a.setAttribute('href', updated);
    window.location.href = updated;
  }

  ['click','pointerdown','touchstart'].forEach(evt => {
    document.addEventListener(evt, maybeHandleWA, true);
    window.addEventListener(evt, maybeHandleWA, true);
  });
})();
