
// Google Maps Autocomplete + price estimation
let mapLoaded = false;
let autocompleteFrom, autocompleteTo;
let directionsService;
const GOOGLE_KEY = "AIzaSyA0neqw7tsdowV0wm4gYPOEIGye7m3TgnE";

window.initMapsStuff = function() {
  try {
    const from = document.getElementById('from');
    const to = document.getElementById('to');
    autocompleteFrom = new google.maps.places.Autocomplete(from, {types: ['geocode'], componentRestrictions: { country: ['fr'] }});
    autocompleteTo = new google.maps.places.Autocomplete(to, {types: ['geocode'], componentRestrictions: { country: ['fr'] }});
    directionsService = new google.maps.DirectionsService();
    mapLoaded = true;
  } catch(e){ console.warn('Maps init warning', e); }
};

function ensureMapsLoaded() {
  if (mapLoaded) return;
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&callback=initMapsStuff`;
  s.async = true; s.defer = true;
  document.head.appendChild(s);
}
ensureMapsLoaded();

// form interactivity
const selectRoundTrip = () => document.getElementById('roundtrip');
const selectWaitEnRoute = () => document.getElementById('waitenroute');
const inputWaitHours = () => document.getElementById('waitHours');
function toggleWaitLock(){
  const rt = selectRoundTrip().value === 'Oui';
  const wr = selectWaitEnRoute().value === 'Oui';
  const lock = (!rt && !wr);
  inputWaitHours().value = lock ? '0' : inputWaitHours().value;
  inputWaitHours().disabled = lock;
}
['change','input'].forEach(ev=>{
  selectRoundTrip().addEventListener(ev,toggleWaitLock);
  selectWaitEnRoute().addEventListener(ev,toggleWaitLock);
});
toggleWaitLock();

async function estimatePrice(){
  const from = document.getElementById('from').value.trim();
  const to = document.getElementById('to').value.trim();
  const hours = parseFloat(inputWaitHours().value||'0');
  const priceEl = document.getElementById('priceValue');
  if(!from || !to){ priceEl.textContent='—'; return; }
  try{
    if(!mapLoaded) ensureMapsLoaded();
    const req = {
      origin: from,
      destination: to,
      travelMode: google.maps.TravelMode.DRIVING
    };
    const res = await directionsService.route(req);
    const meters = res.routes[0].legs[0].distance.value;
    const km = meters/1000.0;

    // simple indicative model
    const pickup = 3.75;
    const perKm = 1.03; // Tarif A by default
    const waitPerHour = 25.0;
    const total = pickup + (km * perKm) + (hours * waitPerHour);
    priceEl.textContent = total.toFixed(2) + ' €';
  }catch(err){
    console.warn(err);
    priceEl.textContent='—';
  }
}

document.getElementById('estimateBtn').addEventListener('click', (e)=>{
  e.preventDefault();
  estimatePrice();
});

// gallery
const images = ["galerie1.jpeg", "galerie2.jpeg", "galerie3.jpeg", "galerie4.jpeg", "galerie5.jpeg", "galerie6.jpeg", "galerie7.jpeg", "galerie8.jpeg", "galerie9.jpeg"];
let current = 0;
function renderGallery(){
  const vp = document.querySelector('.gallery-viewport');
  const dots = document.querySelector('.gallery-dots');
  vp.innerHTML = '';
  dots.innerHTML = '';
  images.forEach((name,idx)=>{
    const img = document.createElement('img');
    img.src = 'images/' + name;
    img.alt = 'Véhicule';
    if(idx===current) img.classList.add('active');
    vp.appendChild(img);

    const dot = document.createElement('button');
    if(idx===current) dot.classList.add('active');
    dot.addEventListener('click',()=>{ current = idx; renderGallery(); });
    dots.appendChild(dot);
  });
}
renderGallery();

// simple submit (no 2nd step buttons per user's latest instruction to keep as before)
document.getElementById('confirmBtn').addEventListener('click', (e)=>{
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if(!name || !phone){ alert('Veuillez saisir votre nom et votre téléphone.'); return; }

  // Build a summary string (used for WhatsApp or email later if desired)
  const summary = [
    `Nom: ${name}`,
    `Téléphone: ${phone}`,
    `Départ: ${document.getElementById('from').value}`,
    `Destination: ${document.getElementById('to').value}`,
    `Date: ${document.getElementById('date').value}`,
    `Heure: ${document.getElementById('time').value}`,
    `Passagers: ${document.getElementById('passengers').value}`,
    `Bagages: ${document.getElementById('luggage').value}`,
    `Aller/retour: ${selectRoundTrip().value}`,
    `Attente pendant le trajet: ${selectWaitEnRoute().value}`,
    `Durée d'attente (h): ${inputWaitHours().value}`,
    `Siège enfant: ${document.getElementById('childseat').value}`,
    `Notes: ${document.getElementById('notes').value}`,
    `Estimation: ${document.getElementById('priceValue').textContent}`
  ].join('%0a');

  // Keep behaviour "as before": open WhatsApp by default.
  const whatsapp = `https://wa.me/590691280005?text=${summary}`;
  window.open(whatsapp, '_blank');
});
