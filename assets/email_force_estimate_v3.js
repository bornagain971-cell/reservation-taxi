
/* TaxiLI — EMAIL FORCE ESTIMATE v3 (aggressive & resilient)
   - Works with <a>, <button>, or <form> submissions.
   - Forces a fresh estimation, WRITES it into the page (#estimateOut), then composes mailto and opens email.
*/
(function(){
  if (window.__EMAIL_FORCE_V3__) return; window.__EMAIL_FORCE_V3__ = true;

  function $(sel){ return document.querySelector(sel); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function formatEUR(n){ return n.toFixed(2).replace('.',',')+' €'; }

  // --- Core estimation helpers ---
  async function ensureEstimateValue(){
    // Prefer site's computeEstimate (sync or async)
    try{
      if(typeof window.computeEstimate === 'function'){
        const v = window.computeEstimate();
        return (v && typeof v.then === 'function') ? await v : v;
      }
    }catch(e){}

    // Fallback: try to recompute roughly if possible (KM already on page or in cache)
    let price = NaN;
    const out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out && out.dataset && out.dataset.value){
      const n = parseFloat(String(out.dataset.value).replace(',','.'));
      if(isFinite(n)) price = n;
    }
    if(!isFinite(price) && out){
      const m = (tv(out).match(/(\d+[.,]\d+)/)||[])[1];
      if(m){
        const n = parseFloat(String(m).replace(',','.'));
        if(isFinite(n)) price = n;
      }
    }
    return price;
  }

  function writeEstimateToPage(price){
    const out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(!out) return;
    if(typeof price === 'number' && isFinite(price)){
      out.textContent = formatEUR(price);
      try { out.dataset.value = String(price); } catch(e){}
    }
  }

  // --- Message builder ---
  function buildEmailBody(price){
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
    if(notes) L.push("Notes: " + notes);
    L.push("Estimation: " + (isFinite(price) ? formatEUR(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\\n");
  }

  function getMailtoTarget(){
    // Try to take the first mailto found in the DOM
    const a = document.querySelector('a[href^=\"mailto:\"]');
    if(a){
      const href = a.getAttribute('href')||'';
      const addr = href.replace(/^mailto:/i,'').split('?')[0].trim();
      if(addr) return 'mailto:'+addr;
    }
    // Fallback to your address
    return 'mailto:taxili@laposte.net';
  }

  async function openEmail(e){
    e.preventDefault();
    // 1) Compute/refresh estimate
    const price = await ensureEstimateValue();
    // 2) Write it into the page so it's visible BEFORE opening mail
    if(isFinite(price)) writeEstimateToPage(price);
    // 3) Compose mailto
    const body = buildEmailBody(price);
    const trigger = e.target && e.target.closest ? e.target.closest('a[href^=\"mailto:\"], [data-action=\"mail\"], #mailBtn, .btn-mail, button[data-role=\"mail\"], form[data-reserve=\"email\"]') : null;
    let href = (trigger && trigger.getAttribute && trigger.getAttribute('href')) || '';
    let mailto = getMailtoTarget();
    let params = new URLSearchParams();
    if(/^mailto:/i.test(href)){
      const parts = href.split('?');
      mailto = parts[0];
      params = new URLSearchParams(parts[1]||'');
    }
    if(!params.has('subject')) params.set('subject','Demande de réservation taxi');
    params.set('body', body);
    const url = mailto + '?' + params.toString();
    if(trigger && trigger.tagName && trigger.tagName.toLowerCase()==='a'){
      trigger.setAttribute('href', url);
    }
    window.location.href = url;
  }

  // Capture clicks on likely email triggers
  function shouldHandle(e){
    const t = e.target;
    if(!t) return false;
    return !!(t.closest && t.closest('a[href^=\"mailto:\"], [data-action=\"mail\"], #mailBtn, .btn-mail, button[data-role=\"mail\"], form[data-reserve=\"email\"]'));
  }

  // Clicks on links/buttons
  ['click','pointerdown','touchstart'].forEach(evt=>{
    document.addEventListener(evt, function(e){ if(shouldHandle(e)) openEmail(e); }, true);
    window.addEventListener(evt, function(e){ if(shouldHandle(e)) openEmail(e); }, true);
  });

  // Form submissions
  document.addEventListener('submit', function(e){
    const f = e.target;
    if(!f) return;
    if(f.matches && f.matches('form[data-reserve=\"email\"], form#reserveEmail, form.mail-reserve')){
      openEmail(e);
    }
  }, true);
})();
