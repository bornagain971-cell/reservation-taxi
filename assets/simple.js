
// TaxiLi - simplified single-source logic
(function(){
  function $(sel){ return document.querySelector(sel); }
  function val(el){ return (el && typeof el.value === 'string') ? el.value.trim() : ''; }
  function num(el){ const v = parseFloat(val(el).replace(',','.')); return isFinite(v) ? v : 0; }
  function boolFrom(el){
    if(!el) return false;
    const tag = (el.tagName||'').toUpperCase();

    // SELECT: value "oui"/"non", "yes"/"no", "1"/"0"
    if(tag === 'SELECT'){
      const v = val(el).toLowerCase();
      return (v.startsWith('o') || v==='yes' || v==='1' || v==='true');
    }

    // Inputs
    if(el.type === 'checkbox' || el.type === 'radio'){
      return !!el.checked;
    }

    // Button/toggle patterns
    const aria = (el.getAttribute && el.getAttribute('aria-pressed')) || '';
    if(aria){ return String(aria).toLowerCase() === 'true'; }

    const ds = el.dataset || {};
    if(ds.active){ return String(ds.active).toLowerCase() === 'true'; }
    if(ds.state){  return String(ds.state).toLowerCase() === 'on'; }
    if(ds.on){     return ['1','true','yes','oui','on'].includes(String(ds.on).toLowerCase()); }

    // Class-based (e.g., .active)
    if(el.classList && el.classList.contains('active')) return true;

    // Fallback to textual value
    const v = (val(el) || (el.textContent||'')).trim().toLowerCase();
    return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on');
  }

  // ids fallbacks
  const els = {
    name: $('#name') || $('#nom') || document.querySelector('input[name="name"]'),
    phone: $('#phone') || $('#tel') || document.querySelector('input[type="tel"]'),
    date:  $('#date')  || document.querySelector('input[type="date"]'),
    time:  $('#time')  || document.querySelector('input[type="time"]'),
    start: $('#start') || $('#depart') || $('#origin'),
    end:   $('#end')   || $('#dest')   || $('#destination'),
    km:    $('#distanceKm') || document.querySelector('input[name="km"]'),
    round: $('#ar') || $('#allerRetour') || $('#roundtrip') || document.querySelector('select#ar, select#allerRetour') || document.querySelector('[data-role="roundtrip"]'),
    waitOn: $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet'),
    waitH:  $('#waitHours')  || $('#attenteHeures') || $('#dureeAttente'),
    notes:  $('#notes'),
    estBtn: $('#estimateBtn'),
    estOut: $('#estimateOut')
  };

  // Prefectoral rates (single source of truth)
  const RATE = Object.freeze({
    base: 3.75,
    A: 1.03, // AR jour (2x KM)
    B: 1.55, // AR nuit (2x KM)
    C: 2.06, // Simple jour
    D: 3.06, // Simple nuit
    waitPerH: 25.00 // heure d'attente optionnelle
  });

  async function getKm(){
    // 1) Global cache
    if(typeof window.__distanceKM === 'number' && isFinite(window.__distanceKM) && window.__distanceKM>0){
      return window.__distanceKM;
    }
    // 2) Explicit field
    const el = document.getElementById('distanceKm');
    if(el){
      const raw = (el.value || el.textContent || '').trim();
      const val = parseFloat(raw.replace(',','.'));
      if(isFinite(val) && val>0){
        window.__distanceKM = val;
        return val;
      }
    }
    // 3) Google DistanceMatrix
    try{
      const start = val(els.start);
      const end   = val(els.end);
      if(start && end && window.google && google.maps && google.maps.DistanceMatrixService){
        const svc = new google.maps.DistanceMatrixService();
        const km = await new Promise((resolve)=>{
          svc.getDistanceMatrix({
            origins:[start],
            destinations:[end],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
          }, (res, status)=>{
            if(status==='OK'){
              const r = res?.rows?.[0]?.elements?.[0];
              if(r && r.status==='OK'){
                resolve((r.distance.value||0)/1000);
                return;
              }
            }
            resolve(null);
          });
        });
        if(km && km>0){
          window.__distanceKM = km;
          return km;
        }
      }
    }catch(e){ /* ignore */ }
    return 0;
  }


  function isNight(hh){
    return (hh < 7 || hh >= 19);
  }

  function selectedHour(){
    const t = val(els.time);
    if(!t) return NaN; // STRICT: no fallback to system time
    const p = t.split(':');
    const h = parseInt(p[0],10);
    return isFinite(h) ? h : NaN;
  }

  function computeFare(params){
    const km = Math.max(0, +params.km || 0);
    const rt = !!params.roundtrip;
    const night = !!params.night;
    const waitH = Math.max(0, +params.waitH || 0);
    const waitOn = !!params.waitOn;

    const perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
    const kmTotal = rt ? km * 2 : km;
    const waitCost = waitOn ? (waitH * RATE.waitPerH) : 0;
    const price = RATE.base + (kmTotal * perKm) + waitCost;
    return Math.round(price * 100) / 100;
  }

  function collectParams(){
    return {
      roundtrip: boolFrom(els.round) || (/^oui$/i.test((els.round && els.round.value)||'')),
      night: isNight(selectedHour()),
      waitOn: boolFrom(els.waitOn),
      waitH: num(els.waitH)
    };
  }

  function formatEUR(v){
    return v.toFixed(2).replace('.', ',') + ' €';
  }

  async function ensureEstimate(){
    // Require time
    const hh = selectedHour();
    if(!isFinite(hh)){
      var errEl = document.getElementById('errTime') || document.querySelector('[data-error-for="time"]');
      if(errEl){ errEl.textContent = "Veuillez choisir une heure."; errEl.style.display='block'; }
      if(els.time){ els.time.classList.add('input-invalid'); els.time.focus(); }
      if(els.estOut){ els.estOut.textContent = ""; els.estOut.dataset.value = ""; }
      return null;
    }
    if(els.estOut){ els.estOut.textContent = "Calcul..."; }
    const params = collectParams();
    const km = await getKm();
    const price = computeFare({ ...params, km });
    if(els.estOut && price!=null){
      els.estOut.textContent = formatEUR(price);
      els.estOut.dataset.value = String(price);
    }
    return price;
  }

  function buildSummary(price){
    const lines = [];
    lines.push("Nouvelle réservation Taxi LI 🚕");
    if(els.name)  lines.push("Nom: " + val(els.name));
    if(els.phone) lines.push("Téléphone: " + val(els.phone));
    if(els.date)  lines.push("Date: " + val(els.date));
    if(els.time)  lines.push("Heure: " + val(els.time));
    if(els.start) lines.push("Départ: " + val(els.start));
    if(els.end)   lines.push("Destination: " + val(els.end));
    if(els.notes) lines.push("Notes: " + val(els.notes));
    lines.push("Estimation: " + formatEUR(price));
    return lines.join("\\n");
  }

  // Bind estimate button
  // Recalculate when round-trip control changes/clicks
  if(els.round){
    const recalc = function(){ ensureEstimate(); };
    ['change','click','input','keyup'].forEach(evt => {
      els.round.addEventListener(evt, recalc, true);
      document.addEventListener(evt, function(e){
        if(e.target === els.round || (e.target && e.target.closest && e.target.closest('#roundtrip,[data-role=roundtrip]'))) {
          ensureEstimate();
        }
      }, true);
    });
  }

  if(els.estBtn){
    els.estBtn.addEventListener('click', function(ev){
      ev.preventDefault();
      ensureEstimate();
    });
  }

  // Intercept WhatsApp/mailto clicks to inject estimate even if not computed before
  async function handleAnchor(e){
    const a = e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href') || '';
    const isWA = /wa\.me|whatsapp/.test(href);
    const isMail = /^mailto:/i.test(href);
    if(!isWA && !isMail) return;
    e.preventDefault();

    const price = await ensureEstimate();
    if(price === null){ return; }
    const msg = buildSummary(price);

    if(isWA){
      // Build a WhatsApp text param
      let base = href.split('?')[0];
      const sep = href.includes('?') ? '&' : '?';
      a.setAttribute('href', base + sep + 'text=' + encodeURIComponent(msg));
    } else if(isMail){
      // Preserve existing subject/body if present; otherwise add them
      const url = new URL(href.replace('mailto:','mailto:'), window.location.origin);
      // Using manual parse because URL with mailto is tricky on some browsers
      const parts = href.split('?');
      const mailto = parts[0]; // mailto:address
      const params = new URLSearchParams(parts[1]||'');
      if(!params.has('subject')) params.set('subject', 'Demande de réservation taxi');
      params.set('body', msg);
      a.setAttribute('href', mailto + '?' + params.toString());
    }
    // navigate now that href is updated
    window.location.href = a.getAttribute('href');
  }

  document.addEventListener('click', handleAnchor, true);

  // Expose API for future (optional)
  window.TaxiLi = {
    RATE, isNight, computeFare, ensureEstimate, buildSummary
  };
})();
