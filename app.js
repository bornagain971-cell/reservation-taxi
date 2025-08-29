
async function autocomplete(inputEl, listEl){
  const q = inputEl.value.trim();
  if(q.length < 2){ listEl.innerHTML=''; return; }
  const bbox = '-61.8,15.8,-61.0,16.6';
  try{
    const url = 'https://photon.komoot.io/api/?lang=fr&q=' + encodeURIComponent(q) + '&limit=6&bbox=' + bbox;
    const r = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!r.ok){ listEl.innerHTML=''; return; }
    const j = await r.json();
    const opts = (j.features||[]).map(f=>{
      const name = f.properties.name || '';
      const city = f.properties.city || f.properties.town || f.properties.county || '';
      const label = [name, city].filter(Boolean).join(' — ');
      return `<option value="${label.replace(/"/g,'&quot;')}"></option>`;
    }).join('');
    listEl.innerHTML = opts;
  }catch(e){
    listEl.innerHTML='';
  }
}
  try{
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=gp&addressdetails=1&q=' + encodeURIComponent(q);
    const r = await fetch(url, {headers:{'Accept':'application/json'}});
    if(!r.ok){ listEl.innerHTML=''; return; }
    const arr = await r.json();
    listEl.innerHTML = arr.map(x=>`<option value="${x.display_name.replace(/"/g,'&quot;')}"></option>`).join('');
  }catch(e){
    listEl.innerHTML='';
  }
}


function requiredFields(){
  return ['name','phone','pickup','dropoff','date','time'];
}

function validateForEstimate(){
  const data = Object.fromEntries(new FormData(qs('#booking-form')).entries());
  const missing = [];
  ['pickup','dropoff','date','time'].forEach(k=>{ if(!data[k] || String(data[k]).trim()===''){ missing.push(k); } });
  const wantWait = (data.roundtrip==='Oui' && data.waitopt==='Oui');
  const waitHours = parseInt(data.wait_hours||'0',10);
  if(wantWait){
    if(!(waitHours>=1 && waitHours<=4)) missing.push('wait_hours');
  }
  return {ok: missing.length===0, missing, data};
}
function validateAll(){
  const data = Object.fromEntries(new FormData(qs('#booking-form')).entries());
  const missing = [];
  ['name','phone','pickup','dropoff','date','time'].forEach(k=>{ if(!data[k] || String(data[k]).trim()===''){ missing.push(k); } });
  const wantWait = (data.roundtrip==='Oui' && data.waitopt==='Oui');
  const waitHours = parseInt(data.wait_hours||'0',10);
  if(!wantWait){
    const el = qs('#wait_hours'); if(el){ el.value='0'; el.disabled = true; }
  }else{
    if(!(waitHours>=1 && waitHours<=4)) missing.push('wait_hours');
  }
  return {ok: missing.length===0, missing, data};
}
  }else{
    if(!(waitHours>=1 && waitHours<=4)) missing.push('wait_hours');
  }
  return {ok: missing.length===0, missing, data};
}
function labelFor(key){
  const map = {name:'Nom et prénom', phone:'Téléphone', pickup:'Lieu de départ', dropoff:'Destination', date:'Date', time:'Heure', wait_hours:'Durée d’attente (heures)'};
  return map[key] || key;
}


function updateWaitHours(){
  const waitSel = qs('#waitopt');
  const roundSel = qs('#roundtrip');
  const waitHoursSel = qs('#wait_hours');
  if(!(waitSel && roundSel && waitHoursSel)) return;
  const enable = (waitSel.value==='Oui' && roundSel.value==='Oui');
  if(enable){
    waitHoursSel.disabled = false;
    if(waitHoursSel.value==='0' || !waitHoursSel.value){ waitHoursSel.value='1'; }
  } else {
    waitHoursSel.value = '0';
    waitHoursSel.disabled = true;
  }
}

  } else {
    waitHoursSel.value = '0';
    waitHoursSel.disabled = true;
  }
}
  } else {
    waitHoursSel.value = '0';
    waitHoursSel.disabled = true;
  }
}
    } else {
      waitHoursSel.value = '0';
      waitHoursSel.disabled = true;
    }
  }
} else {
      waitHoursSel.disabled = true;
    }
  }
}


function qs(s){return document.querySelector(s)}
function onReady(fn){document.addEventListener('DOMContentLoaded', fn)}

const TARIF_A = 1.03; // A/R jour (€/km)
const TARIF_B = 1.55; // A/R nuit et jours fériés (€/km)
const TARIF_C = 2.06; // Aller simple jour (€/km)
const TARIF_D = 3.06; // Aller simple nuit et jours fériés (€/km)
const PRISE_EN_CHARGE = 3.75;
const ATTENTE_HORAIRE = 25.0;

async function geocode(q){
  // Photon API (CORS-friendly), biased to Guadeloupe bbox
  const bbox = '-61.8,15.8,-61.0,16.6'; // lon1,lat1,lon2,lat2
  const url = 'https://photon.komoot.io/api/?lang=fr&q=' + encodeURIComponent(q) + '&limit=1&bbox=' + bbox;
  const r = await fetch(url, {headers:{'Accept':'application/json'}});
  if(!r.ok) throw new Error('Geocoding HTTP '+r.status);
  const j = await r.json();
  if(!j.features || !j.features[0]) throw new Error('Adresse introuvable');
  const f = j.features[0];
  return {lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], display_name: f.properties.name || q};
}

async function routeDistanceKm(a,b){
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const r = await fetch(url);
  if(!r.ok) throw new Error('OSRM HTTP '+r.status);
  const j = await r.json();
  if(!j.routes || !j.routes[0]) throw new Error('Itinéraire introuvable');
  const meters = j.routes[0].distance;
  return meters/1000.0;
}

function isNight(timeStr){
  if(!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [H,M] = timeStr.split(':').map(x=>parseInt(x,10));
  return (H>=19) || (H<7);
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

async function estimatePrice(){

  const out = qs('#estimate');
  const hint = qs('#estimate-hint');
  const v = validateForEstimate();
  if(!v.ok){
    const map = {pickup:'Lieu de départ', dropoff:'Destination', date:'Date', time:'Heure', wait_hours:'Durée d’attente (heures)'};
    const missingLabels = v.missing.map(k=>map[k]||k).join(', ');
    out.textContent = 'Champs manquants: ' + missingLabels;
    if(hint) hint.style.color = '#b91c1c';
    return;
  }
  if(hint) hint.style.color = '#6b7280';
  const pickup = v.data.pickup.trim();
  const dropoff = v.data.dropoff.trim();
  const time = v.data.time.trim();
  const roundSel = qs('#roundtrip');
  const waitSel = qs('#waitopt');
  const waitHoursSel = qs('#wait_hours');
  out.textContent='Calcul…';
  try{
    const A = await geocode(pickup);
    const B = await geocode(dropoff);
    const km_oneway = await routeDistanceKm(A,B);
    const isNightTarif = isNight(time);
    const isRound = roundSel && roundSel.value==='Oui';
    const km_total = isRound ? (km_oneway*2) : km_oneway;
    let tarif_value = TARIF_C; let tarif_type='C';
    if(isRound){ tarif_value = isNightTarif?TARIF_B:TARIF_A; tarif_type = isNightTarif?'B':'A'; }
    else { tarif_value = isNightTarif?TARIF_D:TARIF_C; tarif_type = isNightTarif?'D':'C'; }
    const attente_on = (waitSel && waitSel.value==='Oui' && isRound);
    const h_attente = (waitHoursSel && attente_on) ? parseInt(waitHoursSel.value||'1',10) : 0;
    const attente_cost = h_attente * ATTENTE_HORAIRE;
    const price = km_total*tarif_value + PRISE_EN_CHARGE + attente_cost;
    out.textContent = price.toFixed(2) + ' €';
  }catch(e){
    out.textContent = 'Erreur: ' + e.message;
  }
}

onReady(()=>{
  const form = qs('#booking-form');
  const result = qs('#result');
  const btnEst = qs('#btn-estimate');
  if(btnEst) btnEst.addEventListener('click', estimatePrice);
  const pickupEl = qs('#pickup'); const dropoffEl = qs('#dropoff');
  const pickupList = qs('#pickup_list'); const dropoffList = qs('#dropoff_list');
  if(pickupEl) pickupEl.addEventListener('input', ()=>autocomplete(pickupEl, pickupList));
  if(dropoffEl) dropoffEl.addEventListener('input', ()=>autocomplete(dropoffEl, dropoffList));
  ['roundtrip','waitopt','wait_hours'].forEach(id=>{
    const el = qs('#'+id);
    
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    updateWaitHours();
    const v = validateAll();
    const result = qs('#result');
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
        <p class="small">Astuce : vous pouvez aussi <strong>appeler</strong> directement au <a href="tel:+590691280005">0691 28 00 05</a>.</p>`;
      result.scrollIntoView({behavior:'smooth'});
    }catch(err){
      result.className='notice';
      result.textContent='Impossible de finaliser la réservation : ' + err.message;
      result.scrollIntoView({behavior:'smooth'});
    }
  });
  });
});

// Re-apply wait-hours logic after page visibility changes (fixes iOS cache restores)
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible'){ updateWaitHours(); }});

// Robust toggle: watch for changes even if browser doesn't fire events as expected
function ensureWaitSync(){
  updateWaitHours();
}
const _obs = new MutationObserver(ensureWaitSync);
onReady(()=>{
  const a = document.querySelector('#waitopt');
  const b = document.querySelector('#roundtrip');
  if(a) _obs.observe(a, {attributes:true, attributeFilter:['value']});
  if(b) _obs.observe(b, {attributes:true, attributeFilter:['value']});
  // interval safety net (Safari file:// quirks)
  setInterval(ensureWaitSync, 800);
});
