
/* TaxiLI - Strong override for AR (aller/retour) + computeEstimate
   - Overrides window.roundTripOn() to read #roundtrip/#allerRetour/#ar robustly
   - Overrides window.computeEstimate() to enforce AR logic (A/B with km*2) even if legacy ignores it
   - Falls back to legacy getDistanceKm / isNightOrHoliday if present
*/
(function(){
  function $(sel){ return document.querySelector(sel); }
  function v(el){ return (el && (el.value||el.textContent||'')).trim(); }
  function isYes(x){
    x = (x||'').toString().trim().toLowerCase();
    return x==='oui'||x==='yes'||x==='1'||x==='true'||x==='on';
  }
  function selectedHour(){
    var t = v($('#time'));
    if(!t) return NaN;
    var h = parseInt((t.split(':')[0]||''), 10);
    return isFinite(h) ? h : NaN;
  }
  function isNight(hh){
    return (hh < 7 || hh >= 19);
  }
  function readRoundTrip(){
    var el = $('#roundtrip') || $('#allerRetour') || $('#ar') ||
             document.querySelector('[name="roundtrip"]') || document.querySelector('[name="allerRetour"]');
    if(!el){
      // attempt by label scan
      var labels = Array.from(document.querySelectorAll('label'));
      var lbl = labels.find(lb => /aller\s*\/?\s*retour/i.test(lb.textContent||''));
      if(lbl){
        if(lbl.htmlFor){
          el = document.getElementById(lbl.htmlFor);
        } else {
          el = lbl.parentElement && lbl.parentElement.querySelector('select, input');
        }
      }
    }
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria != null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(v(el));
  }
  // Expose override
  window.roundTripOn = readRoundTrip;

  // Rates from legacy if present, else defaults
  var RATE = (window.RATE || { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 });

  async function getKm(){
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    // legacy helper
    if(typeof window.getDistanceKm === 'function'){
      try{
        var vkm = await window.getDistanceKm();
        if(vkm && vkm>0){ window.__distanceKM=vkm; return vkm; }
      }catch(e){}
    }
    // explicit field
    var el = document.getElementById('distanceKm');
    if(el){
      var raw = v(el).replace(',','.');
      var n = parseFloat(raw);
      if(isFinite(n) && n>0){ window.__distanceKM=n; return n; }
    }
    // last resort: Google DistanceMatrix
    try{
      if(window.google && google.maps && google.maps.DistanceMatrixService){
        var start = v($('#start')||$('#depart')||$('#origin'));
        var end   = v($('#end')||$('#dest')||$('#destination'));
        if(start && end){
          var svc = new google.maps.DistanceMatrixService();
          var km = await new Promise(function(resolve){
            svc.getDistanceMatrix({origins:[start],destinations:[end],travelMode:google.maps.TravelMode.DRIVING,unitSystem:google.maps.UnitSystem.METRIC},
              function(res, status){
                if(status==='OK'){
                  var r = res && res.rows && res.rows[0] && res.rows[0].elements && res.rows[0].elements[0];
                  if(r && r.status==='OK'){ resolve((r.distance.value||0)/1000); return; }
                }
                resolve(0);
              });
          });
          if(km>0){ window.__distanceKM=km; return km; }
        }
      }
    }catch(e){}
    return 0;
  }

  function waitOn(){
    var el = $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria != null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(v(el));
  }
  function waitHours(){
    var el = $('#waitHours') || $('#attenteHeures') || $('#dureeAttente');
    var n = parseFloat((v(el)||'').replace(',','.'));
    return (isFinite(n) && n>0) ? n : 0;
  }
  function ensureTime(){
    var hh = selectedHour();
    if(!isFinite(hh)){
      var errEl = document.getElementById('errTime') || document.querySelector('[data-error-for="time"]');
      if(errEl){ errEl.textContent = "Veuillez choisir une heure."; errEl.style.display='block'; }
      var t = $('#time'); if(t){ t.classList.add('input-invalid'); t.focus(); }
      return null;
    }
    return hh;
  }

  async function computeEstimateOverride(){
    var hh = ensureTime(); if(hh===null) return null;
    var km = await getKm();
    if(!(km>0)) return null;
    var night = isNight(hh);
    var rt = readRoundTrip();
    var perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
    var kmTotal = rt ? km*2 : km;
    var price = RATE.base + (kmTotal * perKm) + (waitOn() ? waitHours() * RATE.waitPerH : 0);
    return Math.round(price*100)/100;
  }

  // Override global computeEstimate if present
  window.computeEstimate = computeEstimateOverride;

  // Also patch UI updates if estimateOut exists
  async function refreshEstimate(){
    var out = document.getElementById('estimateOut');
    if(!out) return;
    out.textContent = "Calcul...";
    var p = await computeEstimateOverride();
    out.textContent = (p==null) ? "" : (p.toFixed(2).replace('.', ',')+" €");
    if(p!=null) out.dataset.value = String(p);
  }

  // Trigger refresh on relevant changes
  ['change','input','click','keyup'].forEach(function(evt){
    document.addEventListener(evt, function(e){
      if(e.target && (e.target.id==='roundtrip' || e.target.id==='allerRetour' || e.target.id==='ar' ||
                      e.target.id==='time' || e.target.id==='date' || e.target.id==='start' || e.target.id==='end' ||
                      e.target.id==='waitOnTrip' || e.target.id==='attente' || e.target.id==='waitHours' || e.target.id==='attenteHeures')){
        refreshEstimate();
      }
    }, true);
  });

  // Initial refresh
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', refreshEstimate);
  } else {
    refreshEstimate();
  }
})();
