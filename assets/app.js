
function qs(s){return document.querySelector(s)}
function onReady(fn){document.addEventListener('DOMContentLoaded', fn)}

// Tarifs
const TARIF_A = 1.03; // A/R jour (€/km)
const TARIF_B = 1.55; // A/R nuit + fériés (€/km)
const TARIF_C = 2.06; // Aller simple jour (€/km)
const TARIF_D = 3.06; // Aller simple nuit + fériés (€/km)
const PRISE_EN_CHARGE = 3.75;
const ATTENTE_HORAIRE = 25.0;

// Google objects
let _gm = { pickupPlace: null, dropoffPlace: null, directions: null, geocoder: null };

function initPlaces(){
  try{
    const pickupEl = document.getElementById('pickup');
    const dropoffEl = document.getElementById('dropoff');
    if(!pickupEl || !dropoffEl) return;
    const opts = { fields: ['geometry','name','formatted_address'], componentRestrictions: { country: ['gp','fr'] } };
    const ap1 = new google.maps.places.Autocomplete(pickupEl, opts);
    const ap2 = new google.maps.places.Autocomplete(dropoffEl, opts);
    ap1.addListener('place_changed', ()=>{ _gm.pickupPlace = ap1.getPlace(); });
    ap2.addListener('place_changed', ()=>{ _gm.dropoffPlace = ap2.getPlace(); });
    _gm.directions = new google.maps.DirectionsService();
    _gm.geocoder = new google.maps.Geocoder();
  }catch(e){
    console.warn('Google Places init failed:', e);
  }
}

function isNight(timeStr){
  if(!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [H] = timeStr.split(':').map(n=>parseInt(n,10));
  return (H>=19)||(H<7);
}

async function geocode(q){
  // Use Google Geocoder if present (with region bias GP)
  try{
    if(_gm.geocoder){
      const res = await _gm.geocoder.geocode({address:q, region:'gp'});
      if(res && res.results && res.results[0]){
        const loc = res.results[0].geometry.location;
        return {lat: loc.lat(), lon: loc.lng(), display_name: res.results[0].formatted_address};
      }
    }
  }catch(e){ console.warn('Google geocode error', e); }
  // Fallback Photon (gratuit)
  const url = 'https://photon.komoot.io/api/?lang=fr&q=' + encodeURIComponent(q) + '&limit=1&bbox=-61.8,15.8,-61.0,16.6';
  const r = await fetch(url);
  if(!r.ok) throw new Error('Geocoding HTTP '+r.status);
  const j = await r.json();
  if(!j.features || !j.features[0]) throw new Error('Adresse introuvable');
  const f = j.features[0];
  return {lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], display_name: f.properties.name || q};
}

async function routeDistanceKm(a,b){
  // Try Google Directions
  try{
    if(_gm.directions){
      const req = { origin: {lat:a.lat, lng:a.lon}, destination: {lat:b.lat, lng:b.lon}, travelMode: 'DRIVING' };
      const res = await _gm.directions.route(req);
      if(res && res.routes && res.routes[0] && res.routes[0].legs && res.routes[0].legs.length){
        const meters = res.routes[0].legs.reduce((s,leg)=>s + (leg.distance?.value||0), 0);
        if(meters>0) return meters/1000.0;
      }
    }
  }catch(e){ console.warn('Google directions error', e); }
  // Fallback OSRM
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const r = await fetch(url);
  if(!r.ok) throw new Error('OSRM HTTP '+r.status);
  const j = await r.json();
  if(!j.routes || !j.routes[0]) throw new Error('Itinéraire introuvable');
  return j.routes[0].distance/1000.0;
}

// Validation helpers
function requiredFields(){ return ['name','phone','pickup','dropoff','date','time']; }
function labelFor(key){
  const map = {name:'Nom et prénom', phone:'Téléphone', pickup:'Lieu de départ', dropoff:'Destination', date:'Date', time:'Heure', wait_hours:'Durée d’attente (heures)'};
  return map[key] || key;
}

function validateAll(){
  const data = Object.fromEntries(new FormData(qs('#booking-form')).entries());
  const missing = [];
  requiredFields().forEach(k=>{ if(!data[k] || String(data[k]).trim()===''){ missing.push(k); } });
  // Waiting rule: only if roundtrip + waitopt are Oui
  const needWait = (data.roundtrip==='Oui' && data.waitopt==='Oui');
  const waitHours = parseInt(data.wait_hours||'0',10);
  if(needWait){
    if(!(waitHours>=1 && waitHours<=4)) missing.push('wait_hours');
  }else{
    const wh = qs('#wait_hours'); if(wh){ wh.value='0'; wh.disabled=true; }
  }
  return {ok: missing.length===0, missing, data};
}

function validateForEstimate(){
  const data = Object.fromEntries(new FormData(qs('#booking-form')).entries());
  const missing = [];
  ['pickup','dropoff','date','time'].forEach(k=>{ if(!data[k] || String(data[k]).trim()===''){ missing.push(k); } });
  const needWait = (data.roundtrip==='Oui' && data.waitopt==='Oui');
  const waitHours = parseInt(data.wait_hours||'0',10);
  if(needWait && !(waitHours>=1 && waitHours<=4)) missing.push('wait_hours');
  return {ok: missing.length===0, missing, data};
}

// Enable/disable wait hours
function updateWaitHours(){
  const waitSel = qs('#waitopt');
  const roundSel = qs('#roundtrip');
  const wh = qs('#wait_hours');
  if(!(waitSel&&roundSel&&wh)) return;
  const enable = (waitSel.value==='Oui' && roundSel.value==='Oui');
  if(enable){ wh.disabled=false; if(wh.value==='0') wh.value='1'; }
  else{ wh.value='0'; wh.disabled=true; }
}

async function computeEstimate(data){
  const pickup = data.pickup.trim();
  const dropoff = data.dropoff.trim();
  const time = data.time.trim();
  const isRound = (data.roundtrip==='Oui');
  const isNightTarif = isNight(time);
  const A = await geocode(pickup);
  const B = await geocode(dropoff);
  const km_oneway = await routeDistanceKm(A,B);
  const km_total = isRound ? (km_oneway*2) : km_oneway;
  let tarif_value = TARIF_C; let tarif_type='C';
  if(isRound){ tarif_value = isNightTarif?TARIF_B:TARIF_A; tarif_type = isNightTarif?'B':'A'; }
  else { tarif_value = isNightTarif?TARIF_D:TARIF_C; tarif_type = isNightTarif?'D':'C'; }
  const attente_on = (data.waitopt==='Oui' && isRound);
  const h_attente = attente_on ? parseInt(data.wait_hours||'1',10) : 0;
  const attente_cost = h_attente * ATTENTE_HORAIRE;
  const price = km_total*tarif_value + PRISE_EN_CHARGE + attente_cost;
  return {price, km: km_total, tarif_type, tarif_value, h_attente, attente_cost};
}

// UI wiring
onReady(()=>{
  // Default date/time today
  const dt = new Date();
  const dEl = qs('#date'); const tEl = qs('#time');
  if(dEl && !dEl.value){ dEl.valueAsDate = dt; }
  if(tEl && !tEl.value){ tEl.value = ('0'+dt.getHours()).slice(-2)+':'+('0'+dt.getMinutes()).slice(-2); }

  updateWaitHours();
  const waitSel = qs('#waitopt'); const roundSel = qs('#roundtrip');
  if(waitSel){ waitSel.addEventListener('change', updateWaitHours); waitSel.addEventListener('input', updateWaitHours); }
  if(roundSel){ roundSel.addEventListener('change', updateWaitHours); roundSel.addEventListener('input', updateWaitHours); }

  const btnEst = qs('#btn-estimate');
  if(btnEst) btnEst.addEventListener('click', async ()=>{
    const out = qs('#estimate'); const hint = qs('#estimate-hint');
    const v = validateForEstimate();
    if(!v.ok){
      const missingLabels = v.missing.map(labelFor).join(', ');
      out.textContent = 'Champs manquants : ' + missingLabels;
      if(hint) hint.style.color = '#b91c1c';
      return;
    }
    if(hint) hint.style.color = '#6b7280';
    out.textContent = 'Calcul…';
    try{
      const est = await computeEstimate(v.data);
      out.textContent = est.price.toFixed(2) + ' €';
    }catch(e){
      out.textContent = 'Erreur : ' + e.message;
    }
  });

  // Submit
  const form = qs('#booking-form'); const result = qs('#result');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    updateWaitHours();
    const v = validateAll();
    if(!v.ok){
      const missingLabels = v.missing.map(labelFor).join(', ');
      result.className='notice';
      result.textContent='Merci de compléter : ' + missingLabels + '.';
      result.scrollIntoView({behavior:'smooth'});
      return;
    }
    try{
      const est = await computeEstimate(v.data);
      const msg = 
`Nouvelle réservation TAXI
Nom: ${v.data.name}
Téléphone: ${v.data.phone}
Trajet: ${v.data.pickup} → ${v.data.dropoff}
Date: ${v.data.date} à ${v.data.time}
Passagers: ${v.data.passengers || '1'}  |  Bagages: ${v.data.luggage || '0'}
Siège enfant: ${v.data.childseat || 'Non'}
Aller/retour: ${v.data.roundtrip || 'Non'}
Attente (heures): ${v.data.wait_hours || '0'}
Distance estimée: ${est.km.toFixed(1)} km
Tarif: ${est.tarif_type} (${est.tarif_value.toFixed(2)} €/km)
Prix estimé: ${est.price.toFixed(2)} €
Notes: ${v.data.notes || '—'}`;

      const wa = "https://wa.me/590691280005/?text=" + encodeURIComponent(msg);
      const subject = encodeURIComponent('Demande de réservation taxi');
      const body = encodeURIComponent(msg);
      const mail = "mailto:taxili@laposte.net?subject=" + subject + "&body=" + body;

      result.className='success';
      result.innerHTML = `<strong>Parfait !</strong> Choisissez un mode d'envoi : 
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn-primary" href="${wa}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a>
          <a class="btn" href="${mail}">Envoyer par e-mail</a>
        </div>
        <p class="muted">Vous pouvez aussi <strong>appeler</strong> au <a href="tel:+590691280005">0691 28 00 05</a>.</p>`;
      result.scrollIntoView({behavior:'smooth'});
    }catch(err){
      result.className='notice';
      result.textContent='Impossible de finaliser la réservation : ' + err.message;
      result.scrollIntoView({behavior:'smooth'});
    }
  });
});
