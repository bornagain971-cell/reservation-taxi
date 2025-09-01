
/* Simplified app.js – preserves original behavior, clearer structure */

// --- Image carousel sources (built from ZIP contents) ---
const vehImages = ["images/veh_1B76F14E-A50C-4300-A8BB-5DB482B35BCC.jpeg", "images/veh_41DB433F-0805-4CF2-92A5-8B453E1FDD9D.jpeg", "images/veh_626A3A30-5D57-41F3-B34E-835EE4BD7EF5.jpeg", "images/veh_64A1AFEF-9183-478D-9C8C-C29A40B7D667.jpeg", "images/veh_68513BAA-E2B0-4E44-9EE1-7D5A84952B58.jpeg", "images/veh_6968DD8D-D761-4FAD-AD3A-FE35380E5602.jpeg", "images/veh_88561D03-6E6B-42A6-82A1-1E65C4855744.jpeg", "images/veh_93477B9D-93DD-4F9E-9D95-8A563048775E.jpeg", "images/veh_A6974BD9-DA63-460D-AED8-780AAA371847.jpeg", "images/veh_C9131168-9059-41FB-B69C-57851A6F7F8D.jpeg"];

// --- DOM helpers ---
const $ = (id) => document.getElementById(id);
const val = (id) => {
  const el = $(id);
  return (el && typeof el.value === 'string') ? el.value.trim() : '';
};
const txt = (id) => {
  const el = $(id);
  return (el && typeof el.textContent === 'string') ? el.textContent.trim() : '';
};

// Read selects (text) with a fallback to value
const sel = (id) => {
  const el = $(id);
  if(!el) return '';
  if (el.options && el.selectedIndex >= 0) {
    return (el.options[el.selectedIndex].text || el.value || '').trim();
  }
  return (el.value || '').trim();
};

// --- Payload (used only for displaying, not for Notes/Estimate which are re-read live) ---
function collectPayload(){ 
  return {
    name: val('name'),
    phone: val('phone'),
    start: val('start'),
    end: val('end'),
    date: val('date'),
    time: val('time'),
    pax: val('pax'),
    bags: val('bags'),
    roundtrip: sel('roundtrip'),
    waitOnTrip: sel('waitOnTrip'),
    waitHours: sel('waitHours'),
    child: sel('child'),
    // Notes & Estimation are read live in handlers to avoid dependency issues
    notes: val('notes'),
    estimate: txt('estimateOut')
  };
}

// --- Confirm area buttons (type='button' to avoid form submit/validation) ---
function setupConfirmSplit(){
  const area = $('confirmArea');
  const btn = $('confirmBtn');
  if(!btn || !area) return;
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    const w = document.createElement('button'); w.type='button';
    w.className='btn'; w.textContent='Réserver par WhatsApp';
    w.addEventListener('click', sendWhatsApp);

    const m = document.createElement('button'); m.type='button';
    m.className='btn'; m.textContent='Réserver par e-mail';
    m.addEventListener('click', sendEmail);

    area.innerHTML=''; area.appendChild(w); area.appendChild(m);
  });
}

// --- Ensure estimate computed (reuses your existing estimator in index.html) ---
function ensureEstimateComputed(){
  try{
    const out = $('estimateOut');
    const cur = out ? (out.textContent||'').trim() : '';
    if(cur && cur !== '—') return;
    const btn = $('estimateBtn');
    if(btn && typeof btn.click === 'function'){ btn.click(); }
  }catch(_){}
}

// --- WhatsApp compose ---
function sendWhatsApp(){
  const p = collectPayload();

  // Force estimator only if missing/placeholder
  ensureEstimateComputed();
  const estimateNow = txt('estimateOut') || p.estimate || '—';

  // Read Notes & toggles directly from DOM to be 100% fresh
  const notesNow    = val('notes');
  const rtNow       = sel('roundtrip');     // "Oui"/"Non"
  const waitNow     = sel('waitOnTrip');    // "Oui"/"Non"
  const waitHNow    = sel('waitHours');     // "0".."4"

  const to = '590691280005'; // Intl format without plus
  const message = [
    'Bonjour, je souhaite réserver.',
    `Nom: ${p.name}`,
    `Téléphone: ${p.phone}`,
    `Départ: ${p.start}`,
    `Destination: ${p.end}`,
    `Date: ${p.date} ${p.time}`,
    `Passagers: ${p.pax}, Bagages: ${p.bags}`,
    `Aller/retour: ${rtNow} | Attente: ${waitNow} (${waitHNow}h)`,
    `Siège enfant: ${p.child}`,
    notesNow ? `Notes: ${notesNow}` : null,
    `Estimation: ${estimateNow}`
  ].filter(Boolean).join('\n');

  window.location.href = 'https://wa.me/'+to+'?text='+encodeURIComponent(message);
}

// --- Email compose ---
function sendEmail(){
  const p = collectPayload();

  // Force estimator only if missing/placeholder
  ensureEstimateComputed();
  const estimateNow = txt('estimateOut') || p.estimate || '—';

  const notesNow    = val('notes');
  const rtNow       = sel('roundtrip');
  const waitNow     = sel('waitOnTrip');
  const waitHNow    = sel('waitHours');

  const subject = `Demande de réservation - ${p.date} ${p.time}`;
  const body = [
    'Bonjour, je souhaite réserver.',
    `Nom: ${p.name}`,
    `Téléphone: ${p.phone}`,
    `Départ: ${p.start}`,
    `Destination: ${p.end}`,
    `Date: ${p.date} ${p.time}`,
    `Passagers: ${p.pax}, Bagages: ${p.bags}`,
    `Aller/retour: ${rtNow} | Attente: ${waitNow} (${waitHNow}h)`,
    `Siège enfant: ${p.child}`,
    notesNow ? `Notes: ${notesNow}` : null,
    `Estimation: ${estimateNow}`
  ].filter(Boolean).join('\n');

  const mailto = 'mailto:taxili97100@gmail.com'
               + '?subject=' + encodeURIComponent(subject)
               + '&body=' + encodeURIComponent(body);
  window.location.href = mailto;
}

// --- Init on DOM ready ---
document.addEventListener('DOMContentLoaded', ()=>{
  setupConfirmSplit();
});
