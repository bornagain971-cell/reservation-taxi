
/* TaxiLI — Compute & display estimate on bottom "Réserver" button
   - Triggers ONLY on the bottom primary "Réserver" button (not WhatsApp / E-mail)
   - Recomputes price: KM -> jour/nuit -> A/B/C/D -> AR -> attente
   - Writes result into #estimateOut (and dataset.value) with a quick visual pulse
*/
(function(){
  if (window.__RESERVE_BTN_ESTIMATE__) return; window.__RESERVE_BTN_ESTIMATE__=true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function num(v){ v = String(v||'').replace(',','.'); var n=parseFloat(v); return isFinite(n)?n:NaN; }
  function eur(n){ return n.toFixed(2).replace('.',',')+' €'; }
  function isYes(v){ v = String(v||'').trim().toLowerCase(); return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on'); }

  const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };

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
    var el = $('#waitHours') || $('#attenteHeures') || $('#dureeAttente') || document.querySelector('[name="attenteHeures"],[name="dureeAttente"]');
    var n = num(tv(el)||'0'); return isFinite(n) ? n : 0;
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
    if(!out) return;
    out.textContent = isFinite(n) ? eur(n) : "(indisponible)";
    try{ out.dataset.value = String(n); }catch(e){}
    // quick visual pulse
    out.classList.add('taxili-pulse');
    setTimeout(function(){ out.classList.remove('taxili-pulse'); }, 600);
  }

  function isReserveButton(el){
    if(!el) return false;
    var node = el.closest && el.closest('a,button');
    if(!node) return false;
    var label = (node.innerText||node.textContent||'').trim().toLowerCase();
    // Accept "réserver" but exclude explicit WhatsApp / E-mail buttons
    if(/whatsapp|email|e-mail/i.test(label)) return false;
    if(label === 'réserver' || label === 'reserver' || /(^|\s)réserver(\s|$)/i.test(label)) return true;
    // Also accept common IDs/classes
    if(node.id && /reserve|reserver/i.test(node.id)) return true;
    if(node.className && /reserve|reserver/i.test(node.className)) return true;
    return false;
  }

  async function onClick(e){
    var trg = e.target;
    if(!trg || !isReserveButton(trg)) return;
    e.preventDefault(); // Only compute/visualize, do not navigate away (you can remove if needed)

    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out) out.textContent = "Calcul...";

    // Require heure + adresses
    var hh = selectedHour();
    var start = tv($('#start')||$('#depart')||$('#origin'));
    var end   = tv($('#end')  ||$('#dest')  ||$('#destination'));
    if(!isFinite(hh) || !start || !end){
      if(out) out.textContent = "(indisponible)";
      // Focus missing field to help the user
      var focusEl = !isFinite(hh) ? ($('#time')||document.querySelector('input[type=\"time\"]')) : (!start ? ($('#start')||$('#depart')||$('#origin')) : ($('#end')||$('#dest')||$('#destination')));
      if(focusEl && focusEl.focus) focusEl.focus();
      return;
    }

    var km  = await getKm();
    var rt  = readRoundTrip();
    var wOn = waitOn();
    var wH  = waitHours();
    var price = (km>0) ? computePrice(km, isNight(hh), rt, wOn, wH) : NaN;

    writeEstimate(price);
  }

  // Add minimal CSS for pulse
  var css = document.createElement('style');
  css.textContent = '.taxili-pulse{ outline:2px solid rgba(0,0,0,.15); box-shadow:0 0 0 6px rgba(0,0,0,.08); transition:box-shadow .2s ease;}';
  document.head.appendChild(css);

  // Hook click on capture to run before other handlers
  ['click','pointerdown','touchstart'].forEach(function(evt){
    document.addEventListener(evt, onClick, true);
    window.addEventListener(evt, onClick, true);
  });
})();
