
/* TaxiLI — WA FORCE AR + WAIT + SUMMARY
   - On "Réserver par WhatsApp" only:
     * force compute price including AR and waiting time
     * write price in UI
     * compose message including: Aller/retour, Attente (Oui/Non), Nombre d'heures, Siège enfant
*/
(function(){
  if (window.__WA_FORCE_AR_WAIT__) return; window.__WA_FORCE_AR_WAIT__ = true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function num(v){ v = String(v||'').replace(',','.'); var n = parseFloat(v); return isFinite(n) ? n : NaN; }
  function eur(n){ return n.toFixed(2).replace('.',',')+' €'; }
  function isYes(v){ v = String(v||'').trim().toLowerCase(); return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on'); }

  const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };

  function selectedHour(){
    var t = tv($('#time') || document.querySelector('input[type="time"]'));
    if(!t) return NaN;
    var h = parseInt((t.split(':')[0]||''),10);
    return isFinite(h)?h:NaN;
  }
  function isNight(h){ return (h<7 || h>=19); }

  function readRoundTrip(){
    var el = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(el.value||el.textContent);
  }

  function waitOn(){
    var el = $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet') || document.querySelector('[name="attente"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(el.value||el.textContent);
  }
  function waitHours(){
    var el = $('#waitHours') || $('#attenteHeures') || $('#dureeAttente') || document.querySelector('[name="attenteHeures"],[name="dureeAttente"]');
    var n = num(tv(el)||'0');
    return isFinite(n) ? n : 0;
  }
  function childSeatOn(){
    var el = $('#childSeat') || $('#siege') || $('#siegeEnfant') || document.querySelector('[name="childSeat"],[name="siegeEnfant"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(el.value||el.textContent);
  }

  async function getKm(){
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    var el = $('#distanceKm');
    if(el){
      var n = num(el.value||el.textContent||'');
      if(isFinite(n) && n>0){ window.__distanceKM=n; return n; }
    }
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
    if(!out) return;
    if(isFinite(n)) { out.textContent = eur(n); try{ out.dataset.value=String(n); }catch(e){} }
    else { out.textContent = ""; }
  }

  function buildWA(price, rt, wOn, wH, seat){
    var L = [];
    function g(sel){ return tv(document.querySelector(sel)); }
    var name  = g('#name') || g('#nom') || g('input[autocomplete="name"]') || g('input[name="name"]');
    var tel   = g('#phone')|| g('#tel') || g('input[type="tel"]');
    var date  = g('#date') || g('input[type="date"]');
    var time  = g('#time') || g('input[type="time"]');
    var dep   = g('#start')|| g('#depart') || g('#origin');
    var dst   = g('#end')  || g('#dest')   || g('#destination');
    var notes = g('#notes')|| g('textarea[name="notes"]') || g('textarea[placeholder*="note" i]');
    var pax   = g('#passengers') || g('select[name="passengers"]') || '';
    var bags  = g('#baggages')   || g('select[name="baggages"]')   || '';

    L.push("Nouvelle réservation Taxi LI 🚕");
    if(name) L.push("Nom: " + name);
    if(tel)  L.push("Téléphone: " + tel);
    if(date) L.push("Date: " + date);
    if(time) L.push("Heure: " + time);
    if(dep)  L.push("Départ: " + dep);
    if(dst)  L.push("Destination: " + dst);
    if(pax || bags) L.push("Passagers: " + (pax||'') + " | Bagages: " + (bags||''));

    // Champs demandés explicitement
    L.push("Aller/retour: " + (rt ? "Oui" : "Non"));
    L.push("Attente pendant le trajet: " + (wOn ? "Oui" : "Non"));
    L.push("Nombre d'heures d'attente: " + (isFinite(wH) ? (wH+"h") : "0h"));
    L.push("Siège enfant: " + (seat ? "Oui" : "Non"));

    if(notes) L.push("Notes: " + notes);
    L.push("Estimation: " + (isFinite(price) ? eur(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  async function onWA(e){
    var a = e.target && e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
    if(!a) return;
    e.preventDefault();

    // 1) Saisies nécessaires
    var hh = selectedHour();
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out) out.textContent = "Calcul...";

    if(!isFinite(hh)){
      if(out) out.textContent = "";
      var tf = $('#time') || document.querySelector('input[type="time"]');
      if(tf) tf.focus();
      return;
    }

    // 2) Lit état AR / Attente / Siège
    var rt   = readRoundTrip();
    var wOn  = waitOn();
    var wH   = waitHours();
    var seat = childSeatOn();

    // 3) KM + prix
    var km = await getKm();
    var price = (km>0) ? computePrice(km, isNight(hh), rt, wOn, wH) : NaN;
    writeEstimate(price);

    // 4) Message
    var msg = buildWA(price, rt, wOn, wH, seat);
    var base = (a.getAttribute('href')||'').split('?')[0];
    var sep  = base.includes('?') ? '&' : '?';
    var href = base + sep + 'text=' + encodeURIComponent(msg);
    a.setAttribute('href', href);
    window.location.href = href;
  }

  ['click','pointerdown','touchstart'].forEach(function(evt){
    document.addEventListener(evt, onWA, true);
    window.addEventListener(evt, onWA, true);
  });
})();
