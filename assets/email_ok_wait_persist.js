
/* TaxiLI — EMAIL OK + WAIT HOURS PERSIST (robust)
   - Fix email: compute → write estimate → build mailto → open (even without <a mailto:>)
   - Persist/guard "Durée d'attente (heures)" against unwanted reset to 1
*/
(function(){
  if (window.__EMAIL_OK_WAIT_PERSIST__) return; window.__EMAIL_OK_WAIT_PERSIST__ = true;

  // ---------- Utils
  function $(s){ return document.querySelector(s); }
  function $$(s){ return Array.from(document.querySelectorAll(s)); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function num(v){ v = String(v||'').replace(',','.'); var n=parseFloat(v); return isFinite(n)?n:NaN; }
  function eur(n){ return n.toFixed(2).replace('.',',')+' €'; }
  function isYes(v){ v = String(v||'').trim().toLowerCase(); return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on'); }

  const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };
  const LS_WAIT_KEY = 'taxili_wait_hours';

  // ---------- WAIT HOURS PERSIST / GUARD
  function pickWaitHoursEl(){
    return $('#waitHours') || $('#attenteHeures') || $('#dureeAttente') || document.querySelector('[name="attenteHeures"],[name="dureeAttente"]');
  }
  function persistWaitHours(value){
    try{ localStorage.setItem(LS_WAIT_KEY, String(value)); }catch(e){}
    var el = pickWaitHoursEl();
    if(el){ el.dataset.userValue = String(value); }
    window.__WAIT_HOURS = value;
  }
  function loadPersistedWaitHours(){
    var v = null;
    try{ v = localStorage.getItem(LS_WAIT_KEY); }catch(e){}
    if(v==null || v==='') return null;
    var n = num(v); return isFinite(n) ? n : null;
  }
  function enforceWaitHoursValue(){
    var el = pickWaitHoursEl();
    if(!el) return;
    var saved = el.dataset.userValue;
    if(saved==null || saved===''){ saved = loadPersistedWaitHours(); }
    var current = tv(el);
    // If external script set it to "1" unexpectedly, restore user's saved value
    if(saved!=null && String(current) !== String(saved)){
      if(String(current) === '1' || current===''){
        el.value = saved;
        // trigger input event for any listeners
        try{ el.dispatchEvent(new Event('input', {bubbles:true})) }catch(e){}
      }
    }
  }
  function initWaitHoursPersist(){
    var el = pickWaitHoursEl();
    if(!el) return;
    // Load saved value on start (only if field is empty or equals default "1")
    var saved = loadPersistedWaitHours();
    if(saved!=null){
      var cur = tv(el);
      if(cur==='' || cur==='1'){ el.value = saved; try{ el.dispatchEvent(new Event('input',{bubbles:true})) }catch(e){} }
      el.dataset.userValue = String(saved);
      window.__WAIT_HOURS = saved;
    } else {
      // initialize from current
      var curN = num(tv(el)||'0');
      persistWaitHours(isFinite(curN)?curN:0);
    }
    // Guard against external resets
    el.addEventListener('input', function(){
      var n = num(tv(el)||'0'); if(!isFinite(n)) n = 0;
      persistWaitHours(n);
    });
    // Observe mutations that could change the value
    try{
      var mo = new MutationObserver(function(){ enforceWaitHoursValue(); });
      mo.observe(el, { attributes:true, attributeFilter:['value','class'], subtree:false });
      // Keep a periodic guard as well
      setInterval(enforceWaitHoursValue, 600);
    }catch(e){ setInterval(enforceWaitHoursValue, 600); }
  }

  // ---------- Compute helpers
  function selectedHour(){ var t = tv($('#time') || document.querySelector('input[type="time"]')); if(!t) return NaN; var h = parseInt((t.split(':')[0]||''),10); return isFinite(h)?h:NaN; }
  function isNight(h){ return (h<7 || h>=19); }
  function readRoundTrip(){
    var el = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed'); if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(el.value||el.textContent);
  }
  function waitOn(){
    var el = $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet') || document.querySelector('[name="attente"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed'); if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(el.value||el.textContent);
  }
  function waitHours(){
    var el = pickWaitHoursEl();
    var n = num(tv(el)||'0');
    if(!isFinite(n) || n<0) n = 0;
    return n;
  }

  async function getKm(){
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    var el = $('#distanceKm');
    if(el){
      var n = num(el.value||el.textContent||'');
      if(isFinite(n) && n>0){ window.__distanceKM=n; return n; }
    }
    // Google Distance Matrix fallback
    try{
      if(window.google && google.maps && google.maps.DistanceMatrixService){
        var start = tv($('#start')||$('#depart')||$('#origin'));
        var end   = tv($('#end')  ||$('#dest')  ||$('#destination'));
        if(start && end){
          var svc = new google.maps.DistanceMatrixService();
          var km = await new Promise(function(resolve){
            svc.getDistanceMatrix(
              {origins:[start],destinations:[end],travelMode:google.maps.TravelMode.DRIVING,unitSystem:google.maps.UnitSystem.METRIC},
              function(res,status){
                if(status==='OK'){
                  var r = res && res.rows && res.rows[0] && res.rows[0].elements && res.rows[0].elements[0];
                  if(r && r.status==='OK'){ resolve((r.distance.value||0)/1000); return; }
                }
                resolve(0);
              }
            );
          });
          if(km>0){ window.__distanceKM=km; return km; }
        }
      }
    }catch(e){}
    return 0;
  }
  function computePrice(km, night, rt, wOn, wH){
    var perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
    var kmTotal = rt ? km*2 : km;
    var waitPart = (wOn && wH>0) ? (wH * RATE.waitPerH) : 0;
    var price = RATE.base + (kmTotal * perKm) + waitPart;
    return Math.round(price*100)/100;
  }
  function writeEstimate(n){
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out){
      out.textContent = isFinite(n) ? eur(n) : "(indisponible)";
      try{ out.dataset.value = String(n); }catch(e){}
    }
  }

  // ---------- Build ALL fields into message
  function labelize(el){
    var id = el.id||'', name = el.name||'', ph = el.placeholder||'';
    var map = {
      name:"Nom", nom:"Nom", phone:"Téléphone", tel:"Téléphone",
      start:"Départ", depart:"Départ", origin:"Départ",
      end:"Destination", dest:"Destination", destination:"Destination",
      date:"Date", time:"Heure",
      passengers:"Passagers", baggages:"Bagages",
      roundtrip:"Aller/retour", allerRetour:"Aller/retour", ar:"Aller/retour",
      attente:"Attente pendant le trajet", waitOnTrip:"Attente pendant le trajet", waitDuring:"Attente pendant le trajet", attente_trajet:"Attente pendant le trajet",
      waitHours:"Durée d'attente (heures)", attenteHeures:"Durée d'attente (heures)", dureeAttente:"Durée d'attente (heures)",
      childSeat:"Siège enfant", siege:"Siège enfant", siegeEnfant:"Siège enfant",
      notes:"Notes utiles"
    };
    if(map[id]) return map[id];
    var mapn = {
      name:"Nom", phone:"Téléphone", tel:"Téléphone",
      start:"Départ", origin:"Départ", end:"Destination", dest:"Destination", destination:"Destination",
      date:"Date", time:"Heure", passengers:"Passagers", baggages:"Bagages",
      roundtrip:"Aller/retour", attente:"Attente pendant le trajet", attenteHeures:"Durée d'attente (heures)",
      dureeAttente:"Durée d'attente (heures)", childSeat:"Siège enfant", siegeEnfant:"Siège enfant", notes:"Notes utiles"
    };
    if(mapn[name]) return mapn[name];
    if(ph) return ph.replace(/\s*\*?$/,'');
    return id||name||"Champ";
  }
  function readAllFields(){
    var fields = [];
    var seen = new Set();
    function push(el){
      if(!el || seen.has(el)) return;
      seen.add(el);
      var label = labelize(el);
      var val = tv(el);
      var idn = (el.id||'') + ' ' + (el.name||'');
      if(/(roundtrip|allerRetour|ar|attente|childSeat|siegeEnfant)/i.test(idn)){
        if(isYes(val)) val='Oui';
        else if(val==='') val='Non';
        else if(/^(false|0|off|non|no)$/i.test(val)) val='Non';
      }
      fields.push({label, value: val || "(vide)"});
    }
    $$('input,select,textarea').forEach(push);
    var est = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(est){ fields.push({label:'Estimation', value: tv(est)||"(indisponible)"}); }
    return fields;
  }
  function buildMessage(){
    var L = [];
    L.push("Bonjour Taxi Li, je souhaite réserver une course.");
    L.push("Nouvelle réservation Taxi Li 🚕");
    readAllFields().forEach(function(f){ L.push(f.label + ": " + f.value); });
    L.push("—"); L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  // ---------- Openers
  function openWA(msg){
    var base = 'https://wa.me/590691280005';
    var waA = document.querySelector('a[href*=\"wa.me\"], a[href*=\"whatsapp\"]');
    if(waA){
      var href = waA.getAttribute('href')||'';
      var m = href.match(/wa\.me\/(\d+)/);
      if(m) base = 'https://wa.me/' + m[1];
    }
    var url = base + '?text=' + encodeURIComponent(msg);
    window.location.href = url;
  }
  function openMail(msg){
    var mailto = 'mailto:taxili@laposte.net';
    var a = document.querySelector('a[href^=\"mailto:\"]');
    if(a){ var href=a.getAttribute('href')||''; mailto = href.split('?')[0]||mailto; }
    var p = new URLSearchParams(); p.set('subject','Demande de réservation taxi'); p.set('body', msg);
    window.location.href = mailto + '?' + p.toString();
  }

  // ---------- Main handler (WA + Email)
  async function handle(e){
    var t = e.target && e.target.closest && e.target.closest('a,button,form');
    if(!t) return;
    var label = (t.innerText||t.textContent||'').toLowerCase();
    var href  = (t.getAttribute && t.getAttribute('href')) || '';
    var isWA  = label.includes('réserver par whatsapp') || label.includes('reserver par whatsapp') || /wa\.me|whatsapp/i.test(href);
    var isMail= label.includes('réserver par e-mail') || label.includes('reserver par e-mail') || /^mailto:/i.test(href) || (t.matches && t.matches('[data-action=\"mail\"],#mailBtn,.btn-mail, a[href*=\"reserver-par-e-mail\"]'));
    if(!isWA && !isMail) return;

    e.preventDefault();
    e.stopPropagation(); try{ e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(err){}

    // Require champ Heure + départ + destination
    var hh = selectedHour();
    var start = tv($('#start')||$('#depart')||$('#origin'));
    var end   = tv($('#end')  ||$('#dest')  ||$('#destination'));
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out) out.textContent = "Calcul...";

    if(!isFinite(hh) || !start || !end){
      if(out) out.textContent = "(indisponible)";
      var focusEl = !isFinite(hh) ? ($('#time')||document.querySelector('input[type=\"time\"]')) : (!start ? ($('#start')||$('#depart')||$('#origin')) : ($('#end')||$('#dest')||$('#destination')));
      if(focusEl && focusEl.focus) focusEl.focus();
      return;
    }

    // Compute estimation
    var km = await getKm();
    var rt = readRoundTrip();
    var wOn = waitOn();
    var wH  = waitHours();
    var price = (km>0) ? computePrice(km, isNight(hh), rt, wOn, wH) : NaN;

    writeEstimate(price);
    var msg = buildMessage();

    if(isWA) openWA(msg); else openMail(msg);
  }

  // Init
  initWaitHoursPersist();
  ['click','pointerdown','touchstart','submit'].forEach(function(evt){
    document.addEventListener(evt, handle, true);
    window.addEventListener(evt, handle, true);
  });
})();
