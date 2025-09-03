
/* TaxiLI — WA WAIT GUARD
   Purpose: ensure WhatsApp message ALWAYS includes "Attente pendant le trajet: Oui/Non (Xh)"
   and Estimation that includes waiting time, regardless of legacy scripts.
   Mechanism: wrap encodeURIComponent to modify the message just before sending to WA.
*/
(function(){
  if (window.__WA_WAIT_GUARD__) return; window.__WA_WAIT_GUARD__ = true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function num(v){ v = String(v||'').replace(',','.'); var n=parseFloat(v); return isFinite(n)?n:NaN; }

  const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };

  function isYes(v){
    v = String(v||'').trim().toLowerCase();
    return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on');
  }

  function roundTripOn(){
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

  function selectedHour(){
    var t = tv($('#time') || document.querySelector('input[type="time"]'));
    if(!t) return NaN;
    var h = parseInt((t.split(':')[0]||''),10);
    return isFinite(h)?h:NaN;
  }
  function isNight(h){ return (h<7 || h>=19); }

  async function getKm(){
    // Cached/forced value first
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    var el = $('#distanceKm');
    if(el){
      var n = num(el.value||el.textContent||'');
      if(isFinite(n) && n>0){ window.__distanceKM=n; return n; }
    }
    // Fallback to Distance Matrix if available
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

  function formatEUR(n){ return n.toFixed(2).replace('.',',')+' €'; }

  function ensureWaitLine(text, wOn, wH){
    var line = "Attente pendant le trajet: " + (wOn ? ("Oui ("+wH+"h)") : "Non (0h)");
    if(/Attente pendant le trajet:/i.test(text)){
      // replace existing line
      return text.replace(/Attente pendant le trajet:[^\n]*\n?/i, line+"\n");
    }
    // Insert before Estimation or before footer
    if(/Estimation:/i.test(text)){
      return text.replace(/(Estimation:[^\n]*\n?)/i, line+"\n$1");
    }
    if(/\n—/.test(text)){
      return text.replace(/\n—/, line+"\n—");
    }
    return text + "\n" + line;
  }

  // Wrap encodeURIComponent to modify WA message
  var _enc = window.encodeURIComponent;
  window.encodeURIComponent = async function(s){
    try{
      if(typeof s === 'string' && /Nouvelle réservation Taxi LI|Nouvelle rÃ©servation Taxi LI/i.test(s)){
        // Read wait values & recompute price
        var wOn = waitOn();
        var wH  = waitHours();
        var hh  = selectedHour();
        var km  = await getKm();
        var rt  = roundTripOn();
        var price = (km>0 && isFinite(hh)) ? computePrice(km, isNight(hh), rt, wOn, wH) : NaN;

        // Add/replace wait line
        var txt = ensureWaitLine(s, wOn, wH);

        // Ensure estimation includes waiting time
        if(isFinite(price)){
          if(/Estimation:/i.test(txt)){
            txt = txt.replace(/Estimation:[^\n]*/i, "Estimation: " + formatEUR(price));
          } else {
            if(/\n—/.test(txt)) txt = txt.replace(/\n—/, "Estimation: "+formatEUR(price)+"\n—");
            else txt += "\nEstimation: " + formatEUR(price);
          }
          // Also mirror to UI if an output exists
          var out = document.querySelector('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
          if(out){ out.textContent = formatEUR(price); try{ out.dataset.value = String(price); }catch(e){} }
        }
        return _enc.call(this, txt);
      }
    }catch(e){ /* swallow */ }
    return _enc.apply(this, arguments);
  };
})();
