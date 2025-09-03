
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


/** Minimal Google Places init to keep autocomplete + callback working if available */
(function(){
  function attachAutocomplete(id){
    try{
      if(!window.google || !google.maps || !google.maps.places || !document.getElementById(id)) return;
      new google.maps.places.Autocomplete(document.getElementById(id), { types: ['geocode'] });
    }catch(e){ /* ignore */ }
  }
  window.initPlaces = function(){
    attachAutocomplete('start'); attachAutocomplete('depart'); attachAutocomplete('origin');
    attachAutocomplete('end');   attachAutocomplete('dest');   attachAutocomplete('destination');
  };
})();


// === High-priority interception to avoid legacy conflicts ===
(function(){
  if(window.__TAXILI_OVERRIDE__) return;
  window.__TAXILI_OVERRIDE__ = true;

  // Intercept anchor clicks first: capture phase
  function captureAnchor(e){
    const a = e.target && e.target.closest && e.target.closest('a');
    if(!a) return;
    const href = a.getAttribute('href')||'';
    const isWA = /wa\.me|whatsapp/.test(href);
    const isMail = /^mailto:/i.test(href);
    if(!isWA && !isMail) return;
    // We'll handle navigation ourselves
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    (async function(){
      const price = await ensureEstimate();
      if(price===null) return;
      const msg = buildSummary(price);
      if(isWA){
        let base = href.split('?')[0];
        const sep = href.includes('?') ? '&' : '?';
        a.setAttribute('href', base + sep + 'text=' + encodeURIComponent(msg));
      } else {
        const parts = href.split('?');
        const mailto = parts[0];
        const params = new URLSearchParams(parts[1]||'');
        if(!params.has('subject')) params.set('subject','Demande de réservation taxi');
        params.set('body', msg);
        a.setAttribute('href', mailto + '?' + params.toString());
      }
      window.location.href = a.getAttribute('href');
    })();
  }

  // Intercept estimate button
  function captureEstimate(e){
    const btn = e.target && e.target.closest && e.target.closest('#estimateBtn');
    if(!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    ensureEstimate();
  }

  ['click','pointerdown','touchstart'].forEach(evt=>{
    document.addEventListener(evt, captureAnchor, true); // capture
    document.addEventListener(evt, captureEstimate, true);
    window.addEventListener(evt, captureAnchor, true);
    window.addEventListener(evt, captureEstimate, true);
  });
})();


  // === Simple gallery builder (no dependency) ===
  const GALLERY_IMAGES = ["images/veh_1B76F14E-A50C-4300-A8BB-5DB482B35BCC.jpeg", "images/veh_41DB433F-0805-4CF2-92A5-8B453E1FDD9D.jpeg", "images/veh_626A3A30-5D57-41F3-B34E-835EE4BD7EF5.jpeg", "images/veh_64A1AFEF-9183-478D-9C8C-C29A40B7D667.jpeg", "images/veh_68513BAA-E2B0-4E44-9EE1-7D5A84952B58.jpeg", "images/veh_6968DD8D-D761-4FAD-AD3A-FE35380E5602.jpeg", "images/veh_88561D03-6E6B-42A6-82A1-1E65C4855744.jpeg", "images/veh_93477B9D-93DD-4F9E-9D95-8A563048775E.jpeg", "images/veh_A6974BD9-DA63-460D-AED8-780AAA371847.jpeg", "images/veh_C9131168-9059-41FB-B69C-57851A6F7F8D.jpeg"];
  function buildGallery(){ 
    const track = document.getElementById('slides');
    const dots  = document.getElementById('dots');
    if(!track) return;
    if(dots) dots.innerHTML = '';
    track.innerHTML = '';
    GALLERY_IMAGES.forEach((src,i)=>{
      const s=document.createElement('div'); s.className='slide'+(i===0?' active':'');
      const img=document.createElement('img'); img.src=src; img.alt='Photo véhicule '+(i+1);
      s.appendChild(img); track.appendChild(s);
      if(dots){
        const d=document.createElement('div'); d.className='dot'+(i===0?' active':'');
        d.addEventListener('click',()=>showSlide(i)); dots.appendChild(d);
      }
    });
  }
  function showSlide(i){
    const slides = Array.from(document.querySelectorAll('#slides .slide'));
    const dots   = Array.from(document.querySelectorAll('#dots .dot'));
    slides.forEach((el,idx)=> el.classList.toggle('active', idx===i));
    dots.forEach((el,idx)=> el.classList.toggle('active', idx===i));
  }
  document.addEventListener('DOMContentLoaded', buildGallery);
