
/* TaxiLI — Email Gate Sequence (strict):
   When clicking "Réserver par e-mail" ONLY:
   1) Put "Calcul..." in the estimate field
   2) Compute estimate (prefers site's computeEstimate)
   3) Write estimate visibly (#estimateOut & dataset.value)
   4) IF (and only if) estimate is visible & valid, open email with full summary
*/
(function(){
  if(window.__EMAIL_GATE_SEQ__) return; window.__EMAIL_GATE_SEQ__ = true;

  function $(s){ return document.querySelector(s); }
  function txt(el){ return (el && (el.value || el.textContent) || '').trim(); }
  function num(v){ v = String(v).replace(',','.'); var n = parseFloat(v); return isFinite(n) ? n : NaN; }
  function eur(n){ return n.toFixed(2).replace('.', ',') + ' €'; }

  function isEmailTrigger(el){
    if(!el) return false;
    var a = el.closest && el.closest('a,button');
    if(!a) return false;
    var label = (a.innerText || a.textContent || '').toLowerCase();
    var mailHref = (a.getAttribute && a.getAttribute('href')) || '';
    if(/^mailto:/i.test(mailHref)) return true;
    // match a few text variants
    if(label.includes('réserver par e-mail') || label.includes('reserver par e-mail') ||
       label.includes('réserver par email') || label.includes('reserver par email')) return true;
    // data attributes
    if(a.hasAttribute('data-action') && a.getAttribute('data-action')==='mail') return true;
    if(a.id === 'mailBtn' || a.classList.contains('btn-mail')) return true;
    return false;
  }

  async function computeEstimateSafe(){
    // Prefer site's computeEstimate (sync or async)
    try{
      if(typeof window.computeEstimate === 'function'){
        var v = window.computeEstimate();
        return (v && typeof v.then === 'function') ? await v : v;
      }
    }catch(e){}
    // Fallback: read from the estimate field if already present
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out){
      if(out.dataset && out.dataset.value){
        var n = num(out.dataset.value);
        if(isFinite(n)) return n;
      }
      var m = (txt(out).match(/(\d+[.,]\d+)/)||[])[1];
      if(m){ var n2 = num(m); if(isFinite(n2)) return n2; }
    }
    return NaN;
  }

  function writeEstimate(n){
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(!out) return false;
    if(!isFinite(n)) return false;
    out.textContent = eur(n);
    try{ out.dataset.value = String(n); }catch(e){}
    return true;
  }

  // Build the email body (robust selectors)
  function buildBody(price){
    var L = [];
    function g(sel){ return txt(document.querySelector(sel)); }
    var name  = g('#name') || g('#nom') || g('input[autocomplete="name"]') || g('input[name="name"]');
    var tel   = g('#phone')|| g('#tel') || g('input[type="tel"]');
    var date  = g('#date') || g('input[type="date"]');
    var time  = g('#time') || g('input[type="time"]');
    var dep   = g('#start')|| g('#depart') || g('#origin');
    var dst   = g('#end')  || g('#dest')   || g('#destination');
    var notes = g('#notes')|| g('textarea[name="notes"]') || g('textarea[placeholder*="note" i]');
    // Round-trip: try common selectors
    var rEl = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
    var rV  = (rEl && (rEl.value||rEl.textContent) || '').toLowerCase();
    var rt  = rV.includes('oui') || rV==='1' || rV==='true' || (rEl && rEl.classList && rEl.classList.contains('active'));

    L.push("Nouvelle réservation Taxi LI 🚕");
    if(name) L.push("Nom: " + name);
    if(tel)  L.push("Téléphone: " + tel);
    if(date) L.push("Date: " + date);
    if(time) L.push("Heure: " + time);
    if(dep)  L.push("Départ: " + dep);
    if(dst)  L.push("Destination: " + dst);
    L.push("Aller/retour: " + (rt ? "Oui" : "Non"));
    if(notes) L.push("Notes: " + notes);
    L.push("Estimation: " + (isFinite(price) ? eur(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  function findMailto(){
    // Use existing mailto in DOM if present; else fallback
    var a = document.querySelector('a[href^="mailto:"]');
    if(a){
      var href = a.getAttribute('href') || '';
      return href.split('?')[0];
    }
    return 'mailto:taxili@laposte.net';
  }

  async function onTrigger(e){
    var trg = e.target && e.target.closest && e.target.closest('a,button');
    if(!isEmailTrigger(trg)) return;
    e.preventDefault();

    // put "Calcul..." in the UI
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out){ out.textContent = "Calcul..."; }

    // Require time field (we gate on this)
    var t = txt($('#time') || document.querySelector('input[type="time"]'));
    if(!t){
      if(out){ out.textContent = ""; }
      var tf = $('#time') || document.querySelector('input[type="time"]');
      if(tf){ tf.focus(); }
      return; // STOP: do not open email
    }

    // Compute (prefer site's computeEstimate which should consider km/time/AR)
    var price = await computeEstimateSafe();

    // Write visibly and gate opening
    var ok = writeEstimate(price);
    if(!ok){
      // Could not compute — STOP
      if(out){ out.textContent = ""; }
      return;
    }

    // At this point the estimate IS visible, go ahead and open email
    var body = buildBody(price);
    var mailto = 'mailto:';
    var href = (trg.getAttribute && trg.getAttribute('href')) || '';
    var params = new URLSearchParams();
    if(/^mailto:/i.test(href)){
      var parts = href.split('?'); mailto = parts[0]; params = new URLSearchParams(parts[1]||'');
    } else {
      mailto = findMailto();
    }
    if(!params.has('subject')) params.set('subject', 'Demande de réservation taxi');
    params.set('body', body);

    var url = mailto + '?' + params.toString();
    if(trg.tagName.toLowerCase()==='a'){ trg.setAttribute('href', url); }
    window.location.href = url;
  }

  ['click','pointerdown','touchstart'].forEach(function(ev){
    document.addEventListener(ev, onTrigger, true);  // capture phase to run first
    window.addEventListener(ev, onTrigger, true);
  });
})();
