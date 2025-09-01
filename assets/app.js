
const vehImages = ["images/veh_88561D03-6E6B-42A6-82A1-1E65C4855744.jpeg", "images/veh_A6974BD9-DA63-460D-AED8-780AAA371847.jpeg", "images/veh_41DB433F-0805-4CF2-92A5-8B453E1FDD9D.jpeg", "images/veh_93477B9D-93DD-4F9E-9D95-8A563048775E.jpeg", "images/veh_64A1AFEF-9183-478D-9C8C-C29A40B7D667.jpeg", "images/veh_1B76F14E-A50C-4300-A8BB-5DB482B35BCC.jpeg", "images/veh_626A3A30-5D57-41F3-B34E-835EE4BD7EF5.jpeg", "images/veh_C9131168-9059-41FB-B69C-57851A6F7F8D.jpeg", "images/veh_6968DD8D-D761-4FAD-AD3A-FE35380E5602.jpeg", "images/veh_68513BAA-E2B0-4E44-9EE1-7D5A84952B58.jpeg"];

function buildGallery(){ 
  const track = document.querySelector('#slides');
  const dots = document.querySelector('#dots');
  track.innerHTML=''; dots.innerHTML='';
  vehImages.forEach((src,i)=>{
    const s=document.createElement('div'); s.className='slide'+(i===0?' active':'');
    const img=document.createElement('img'); img.src=src; img.alt='Photo véhicule '+(i+1);
    s.appendChild(img); track.appendChild(s);
    const d=document.createElement('div'); d.className='dot'+(i===0?' active':'');
    d.addEventListener('click',()=>showSlide(i)); dots.appendChild(d);
  });
}
let current=0;
function showSlide(i){
  const slides=[...document.querySelectorAll('.slide')];
  const dots=[...document.querySelectorAll('.dot')];
  if(slides.length===0)return;
  current=(i+slides.length)%slides.length;
  slides.forEach((el,idx)=>el.classList.toggle('active', idx===current));
  dots.forEach((el,idx)=>el.classList.toggle('active', idx===current));
}

function initPlaces(){ 
  const bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(15.8, -61.9), // S-O Guadeloupe
    new google.maps.LatLng(16.6, -60.8)  // N-E Guadeloupe
  );
  const options = { bounds: bounds, strictBounds: true, componentRestrictions: { country: ['GP','FR'] }, fields: ['formatted_address','geometry','name'], types: ['geocode'] };
  const dep = new google.maps.places.Autocomplete(document.getElementById('start'), options);
  const dest = new google.maps.places.Autocomplete(document.getElementById('end'), options);
}

function lockWaitIfNeeded(){
  const ar = document.getElementById('roundtrip').value;
  const waitTrip = document.getElementById('waitOnTrip').value;
  const wait = document.getElementById('waitHours');
  const shouldLock = (ar==='Non' && waitTrip==='Non');
  if(shouldLock){ wait.value='0'; wait.disabled=true; } else { wait.disabled=false; }
}

function setupConfirmSplit(){
  const area = document.getElementById('confirmArea');
  const btn = document.getElementById('confirmBtn');
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    const w = document.createElement('button'); 
    w.className='btn'; w.textContent='Réserver par WhatsApp';
    w.addEventListener('click', sendWhatsApp);
    const m = document.createElement('button'); 
    m.className='btn'; m.textContent='Réserver par e‑mail';
    m.addEventListener('click', sendEmail);
    area.innerHTML=''; area.appendChild(w); area.appendChild(m);
  });
}

function collectPayload(){
  const f = (id)=>document.getElementById(id).value.trim();
  return {
    name:f('name'), phone:f('phone'), start:f('start'), end:f('end'),
    date:f('date'), time:f('time'), pax:f('pax'), bags:f('bags'),
    roundtrip:f('roundtrip'), waitOnTrip:f('waitOnTrip'), waitHours:f('waitHours'),
    child:f('child'), notes:f('notes'), estimate: document.getElementById('estimateOut').textContent.trim()
  };
}

function sendWhatsApp(){
  // Collect basic fields
  const get = (id)=>{ const el = document.getElementById(id); return el ? (el.value||'').trim() : ''; };
  const getSel = (id)=>{
    const el = document.getElementById(id);
    if(!el) return '';
    if(el.options && el.selectedIndex>=0){ return (el.options[el.selectedIndex].text||el.value||'').trim(); }
    return (el.value||'').trim();
  };

  const p = {
    name:get('name'), phone:get('phone'), start:get('start'), end:get('end'),
    date:get('date'), time:get('time'),
    pax:get('pax'), bags:get('bags'),
    roundtrip:getSel('roundtrip'),
    waitOnTrip:getSel('waitOnTrip'),
    waitHours:getSel('waitHours'),
    child:getSel('child'),
    notes:get('notes')
  };

  // Helper to finally open WhatsApp with a given estimation string
  function openWA(estimationText){
    const to = '590691280005';
    const msg = [
      'Bonjour, je souhaite réserver.',
      `Nom: ${p.name}`,
      `Téléphone: ${p.phone}`,
      `Départ: ${p.start}`,
      `Destination: ${p.end}`,
      `Date: ${p.date} ${p.time}`,
      `Passagers: ${p.pax}, Bagages: ${p.bags}`,
      `Aller/retour: ${p.roundtrip} | Attente: ${p.waitOnTrip} (${p.waitHours}h)`,
      `Siège enfant: ${p.child}`,
      p.notes ? `Notes: ${p.notes}` : null,
      `Estimation: ${estimationText}`
    ].filter(Boolean).join('\n');
    window.location.href = 'https://wa.me/'+to+'?text='+encodeURIComponent(msg);
  }

  // Try to compute a fresh estimate if needed
  const outEl = document.getElementById('estimateOut');
  let currentEst = outEl ? (outEl.textContent||'').trim() : '';
  if(currentEst && currentEst !== '—'){
    openWA(currentEst);
    return;
  }

  // If Maps not available or start/end missing, fallback to message
  if(!(window.google && google.maps && google.maps.DistanceMatrixService) || !p.start || !p.end){
    openWA(currentEst || '—');
    return;
  }

  // Build same logic as estimator: A/R, night tariff, wait price
  const isRoundTrip = (p.roundtrip||'').toLowerCase() === 'oui';
  const night = (typeof isNight === 'function') ? !!isNight() : false;
  const perKm = (typeof pickTariff === 'function') ? pickTariff(isRoundTrip, night) : 1;
  const waitOn = (p.waitOnTrip||'').toLowerCase() === 'oui';
  const waitH = parseInt(p.waitHours || '0', 10) || 0;
  const waitPrice = waitOn ? (25 * waitH) : 0;
  const pickup = (typeof basePickup === 'number') ? basePickup : 0;

  try{
    const svc = new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix({
      origins: [p.start],
      destinations: [p.end],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC
    }, function(res, status){
      try{
        if(status !== 'OK' || !res || !res.rows || !res.rows[0] || !res.rows[0].elements || !res.rows[0].elements[0] || !res.rows[0].elements[0].distance){
          openWA(currentEst || '—');
          return;
        }
        const km = res.rows[0].elements[0].distance.value / 1000.0;
        const totalKm = km * (isRoundTrip ? 2 : 1);
        const price = pickup + perKm * totalKm + waitPrice;
        const estText = Math.round(price) + ' €';
        if(outEl) outEl.textContent = estText; // reflect on page too
        openWA(estText);
      }catch(e){
        openWA(currentEst || '—');
      }
    });
  }catch(e){
    openWA(currentEst || '—');
  }
}

function sendEmail(){
  const get = (id)=>{ const el = document.getElementById(id); return el ? (el.value||'').trim() : ''; };
  const getSel = (id)=>{
    const el = document.getElementById(id);
    if(!el) return '';
    if(el.options && el.selectedIndex>=0){ return (el.options[el.selectedIndex].text||el.value||'').trim(); }
    return (el.value||'').trim();
  };

  const p = {
    name:get('name'), phone:get('phone'), start:get('start'), end:get('end'),
    date:get('date'), time:get('time'),
    pax:get('pax'), bags:get('bags'),
    roundtrip:getSel('roundtrip'),
    waitOnTrip:getSel('waitOnTrip'),
    waitHours:getSel('waitHours'),
    child:getSel('child'),
    notes:get('notes')
  };

  function openEmail(estimationText){
    const subject = `Demande de réservation - ${p.date} ${p.time}`;
    const body = [
      'Bonjour, je souhaite réserver.',
      `Nom: ${p.name}`,
      `Téléphone: ${p.phone}`,
      `Départ: ${p.start}`,
      `Destination: ${p.end}`,
      `Date: ${p.date} ${p.time}`,
      `Passagers: ${p.pax}, Bagages: ${p.bags}`,
      `Aller/retour: ${p.roundtrip} | Attente: ${p.waitOnTrip} (${p.waitHours}h)`,
      `Siège enfant: ${p.child}`,
      p.notes ? `Notes: ${p.notes}` : null,
      `Estimation: ${estimationText}`
    ].filter(Boolean).join('\n');
    const mailto = 'mailto:taxili97100@gmail.com'
                 + '?subject=' + encodeURIComponent(subject)
                 + '&body=' + encodeURIComponent(body);
    window.location.href = mailto;
  }

  const outEl = document.getElementById('estimateOut');
  let currentEst = outEl ? (outEl.textContent||'').trim() : '';
  if(currentEst && currentEst !== '—'){
    openEmail(currentEst);
    return;
  }

  if(!(window.google && google.maps && google.maps.DistanceMatrixService) || !p.start || !p.end){
    openEmail(currentEst || '—');
    return;
  }

  const isRoundTrip = (p.roundtrip||'').toLowerCase() === 'oui';
  const night = (typeof isNight === 'function') ? !!isNight() : false;
  const perKm = (typeof pickTariff === 'function') ? pickTariff(isRoundTrip, night) : 1;
  const waitOn = (p.waitOnTrip||'').toLowerCase() === 'oui';
  const waitH = parseInt(p.waitHours || '0', 10) || 0;
  const waitPrice = waitOn ? (25 * waitH) : 0;
  const pickup = (typeof basePickup === 'number') ? basePickup : 0;

  try{
    const svc = new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix({
      origins: [p.start],
      destinations: [p.end],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC
    }, function(res, status){
      try{
        if(status !== 'OK' || !res || !res.rows || !res.rows[0] || !res.rows[0].elements || !res.rows[0].elements[0] || !res.rows[0].elements[0].distance){
          openEmail(currentEst || '—');
          return;
        }
        const km = res.rows[0].elements[0].distance.value / 1000.0;
        const totalKm = km * (isRoundTrip ? 2 : 1);
        const price = pickup + perKm * totalKm + waitPrice;
        const estText = Math.round(price) + ' €';
        if(outEl) outEl.textContent = estText;
        openEmail(estText);
      }catch(e){
        openEmail(currentEst || '—');
      }
    });
  }catch(e){
    openEmail(currentEst || '—');
  }
}

function setup(){
  buildGallery();
  document.getElementById('roundtrip').addEventListener('change', lockWaitIfNeeded);
  document.getElementById('waitOnTrip').addEventListener('change', lockWaitIfNeeded);
  lockWaitIfNeeded();
  setupConfirmSplit();
}
window.addEventListener('DOMContentLoaded', setup);
