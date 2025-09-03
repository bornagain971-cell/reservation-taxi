
(function(){
  function ready(fn){ if(document.readyState!=='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  ready(function(){
    var btn = document.getElementById('estimateBtn') || document.querySelector('.estimate-btn, button[data-action="estimate"]');
    if(!btn) return;

    var out = document.getElementById('estimateOut');
    if(!out){
      // fallback: create an output pill next to button if missing
      out = document.createElement('div'); out.id='estimateOut';
      out.style.display='inline-block'; out.style.marginLeft='10px'; out.style.padding='10px 12px';
      out.style.borderRadius='10px'; out.style.background='#f0f0f0'; out.style.minWidth='80px'; out.style.textAlign='center';
      btn.parentNode && btn.parentNode.appendChild(out);
    }

    function getVal(sel){
      var el = document.querySelector(sel);
      return el ? (el.value||'').trim() : '';
    }
    function getSelect(sel){
      var el = document.querySelector(sel);
      return el ? (el.value||'').trim() : '';
    }
    function parseWaitHours(){
      var waitSel = document.getElementById('waitOnTrip') || document.getElementById('waitDuring');
      var hoursSel = document.getElementById('waitHours');
      if(!waitSel || !hoursSel) return 0;
      if(hoursSel.disabled) return 0;
      return (String(waitSel.value).toLowerCase()==='oui') ? parseInt(hoursSel.value||'0',10)||0 : 0;
    }
    function isNight(dateStr, timeStr){
      // night if 19:00..23:59 or 00:00..06:59
      try{
        var parts = (timeStr||'').split(':');
        var h = parseInt(parts[0]||'0',10);
        if(isNaN(h)) return false;
        return (h >= 19 || h < 7);
      }catch(e){ return false; }
    }

    function pickTariff(isRoundTrip, night){
      // â‚¬/km based on rules provided earlier
      // A=1.03 (roundtrip day), B=1.55 (roundtrip night/holiday)
      // C=2.06 (one-way day), D=3.06 (one-way night/holiday)
      if(isRoundTrip){
        return night ? 1.55 : 1.03;
      }else{
        return night ? 3.06 : 2.06;
      }
    }

    function estimateWithDistanceMatrix(origin, destination, cb){
      if(!(window.google && google.maps && google.maps.DistanceMatrixService)){
        cb(new Error('Google DistanceMatrix non disponible'), null);
        return;
      }
      var service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix({
        origins: [origin],
        destinations: [destination],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
      }, function(response, status){
        if(status !== 'OK' || !response || !response.rows || !response.rows[0] || !response.rows[0].elements || !response.rows[0].elements[0]){
          cb(new Error('DistanceMatrix status: '+status), null);
          return;
        }
        var el = response.rows[0].elements[0];
        if(el.status !== 'OK'){
          cb(new Error('Element status: '+el.status), null);
          return;
        }
        var meters = el.distance && el.distance.value;
        cb(null, (meters||0)/1000.0);
      });
    }

    btn.addEventListener('click', function(e){
      // If other validators block (missing fields), let them show errors;
      // we only proceed if origin & destination are present.
      var origin = getVal('#start, #depart, #origin, input[name="origin"], input[name="start"]');
      var destination = getVal('#end, #destination, #dest, input[name="destination"]');
      if(!origin || !destination){ return; }

      out.textContent = 'â€¦';

      var dateStr = getVal('#date, input[type="date"]');
      var timeStr = getVal('#time, input[type="time"]');
      var roundtripVal = getSelect('#roundtrip, #roundTrip');
      var isRoundTrip = (String(roundtripVal).toLowerCase()==='oui');
      var night = isNight(dateStr, timeStr);
      var perKm = pickTariff(isRoundTrip, night);
      var pickup = 3.75; // prise en charge
      var waitH = parseWaitHours();
      var waitPrice = (waitH>0 ? (25 * waitH) : 0);

      estimateWithDistanceMatrix(origin, destination, function(err, km){
        if(err){
          out.textContent = 'Erreur';
          return;
        }
        var totalKm = isRoundTrip ? (km * 2) : km;
        var total = pickup + (totalKm * perKm) + waitPrice;
        // round to 2 decimals
        total = Math.round(total * 100) / 100;
        out.textContent = total.toFixed(2) + ' â‚¬';
      });
    });
  });
})();
