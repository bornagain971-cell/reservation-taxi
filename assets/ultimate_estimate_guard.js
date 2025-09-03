
/* TaxiLI - Ultimate guard to enforce AR + correct estimate on screen and messages.
   - Recomputes price with AR (A/B + km*2) using time field for day/night.
   - If any script writes an incorrect estimate, a MutationObserver corrects it.
   - Hooks WA/mailto to always include the corrected price.
*/
(function(){
  var GUARD = { setting:false };

  function $ (sel){ return document.querySelector(sel); }
  function $$ (sel){ return Array.from(document.querySelectorAll(sel)); }
  function tv(x){ return (x && (x.value||x.textContent||'')).trim(); }
  function num(x){ var s=tv(x).replace(',','.'); var n=parseFloat(s); return isFinite(n)?n:0; }
  function isYes(v){
    v = (v||'').toString().trim().toLowerCase();
    return v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on';
  }
  function selectedHour(){
    var t = tv($('#time'));
    if(!t) return NaN;
    var h = parseInt((t.split(':')[0]||''),10);
    return isFinite(h)?h:NaN;
  }
  function isNight(hh){ return (hh<7 || hh>=19); }
  function roundTripOn(){
    var el = $('#roundtrip') || $('#allerRetour') || $('#ar') || $('[name="roundtrip"]');
    if(!el){
      // scan by label "Aller/retour"
      var lbl = Array.from(document.querySelectorAll('label')).find(l=>/aller\s*\/?\s*retour/i.test(l.textContent||''));
      if(lbl){
        if(lbl.htmlFor) el = document.getElementById(lbl.htmlFor);
        else el = lbl.parentElement && lbl.parentElement.querySelector('select,input,button');
      }
    }
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    var val = (el.value || el.textContent || '').trim();
    return isYes(val);
  }
  var RATE = (window.RATE || { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 });

  function waitOn(){
    var el = $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet');
    if(!el) return false;
    if(el.tagName==='SELECT') return isYes(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return isYes(tv(el));
  }
  function waitHours(){
    var el = $('#waitHours') || $('#attenteHeures') || $('#dureeAttente');
    var n = parseFloat((tv(el)||'').replace(',','.'));
    return (isFinite(n) && n>0) ? n : 0;
  }

  async function getKm(){
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    if(typeof window.getDistanceKm === 'function'){
      try{
        var vkm = await window.getDistanceKm();
        if(vkm && vkm>0){ window.__distanceKM=vkm; return vkm; }
      }catch(e){}
    }
    var el = document.getElementById('distanceKm');
    if(el){
      var raw = tv(el).replace(',','.');
      var n = parseFloat(raw);
      if(isFinite(n) && n>0){ window.__distanceKM=n; return n; }
    }
    try{
      if(window.google && google.maps && google.maps.DistanceMatrixService){
        var start = tv($('#start')||$('#depart')||$('#origin'));
        var end   = tv($('#end')||$('#dest')||$('#destination'));
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

  async function computeGuard(){
    var hh = selectedHour();
    if(!isFinite(hh)) return null;
    var km = await getKm();
    if(!(km>0)) return null;
    var night = isNight(hh);
    var rt = roundTripOn();
    var perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
    var kmTotal = rt ? km*2 : km;
    var price = RATE.base + (kmTotal * perKm) + (waitOn() ? waitHours()*RATE.waitPerH : 0);
    return Math.round(price*100)/100;
  }

  function formatEUR(p){ return p.toFixed(2).replace('.',',')+' €'; }

  async function enforceOutput(el){
    if(!el || GUARD.setting) return;
    var p = await computeGuard();
    if(p==null) return; // don’t overwrite when missing time/km
    var want = formatEUR(p);
    var cur = (el.textContent||'').trim();
    if(cur !== want){
      GUARD.setting = true;
      try{ el.textContent = want; el.dataset.value = String(p); } finally { GUARD.setting = false; }
    }
  }

  function watch(el){
    if(!el) return;
    // Initial correction
    enforceOutput(el);
    // Observe future changes
    var mo = new MutationObserver(function(muts){
      if(GUARD.setting) return;
      enforceOutput(el);
    });
    mo.observe(el, { characterData:true, subtree:true, childList:true });
  }

  // Hook all likely "estimation" elements
  function hookAll(){
    ['#estimateOut','.result','.estimation','.estimateValue'].forEach(function(sel){
      $$(sel).forEach(watch);
    });
  }

  // Recompute on relevant input changes
  ['change','input','click','keyup'].forEach(function(evt){
    document.addEventListener(evt, function(e){
      var id = (e.target && e.target.id)||'';
      if(['roundtrip','allerRetour','ar','time','date','start','depart','origin','end','dest','destination','waitOnTrip','attente','waitHours','attenteHeures','dureeAttente'].includes(id)){
        var el = document.getElementById('estimateOut') || document.querySelector('.result') || document.querySelector('.estimation') || document.querySelector('.estimateValue');
        if(el){ enforceOutput(el); }
      }
    }, true);
  });

  // Hook WA/mailto so they always get the good estimate
  async function updateAnchorMsg(a){
    var p = await computeGuard();
    if(p==null) return false;
    var msg = buildSummary(p);
    var href = a.getAttribute('href')||'';
    if(/wa\.me|whatsapp/.test(href)){
      var base = href.split('?')[0]; var sep = href.includes('?')?'&':'?';
      a.setAttribute('href', base + sep + 'text=' + encodeURIComponent(msg));
      return true;
    }
    if(/^mailto:/i.test(href)){
      var parts = href.split('?');
      var mailto = parts[0]; var params = new URLSearchParams(parts[1]||'');
      if(!params.has('subject')) params.set('subject','Demande de réservation taxi');
      params.set('body', msg);
      a.setAttribute('href', mailto + '?' + params.toString());
      return true;
    }
    return false;
  }

  function buildSummary(price){
    var L=[];
    L.push("Nouvelle réservation Taxi LI 🚕");
    var f = function(id){ var el=$(id); return el? (el.value||'').trim():''; };
    L.push("Nom: "+(f('#name')||f('#nom')||f('input[autocomplete=\"name\"]')||f('input[name=\"name\"]')));
    L.push("Téléphone: "+(f('#phone')||f('#tel')||f('input[type=\"tel\"]')));
    L.push("Date: "+(f('#date')||f('input[type=\"date\"]')));
    L.push("Heure: "+(f('#time')||f('input[type=\"time\"]')));
    L.push("Départ: "+(f('#start')||f('#depart')||f('#origin')));
    L.push("Destination: "+(f('#end')||f('#dest')||f('#destination')));
    var notes = $('#notes'); if(notes) L.push("Notes: "+(notes.value||'').trim());
    L.push("Estimation: "+formatEUR(price));
    return L.join("\\n");
  }

  function interceptAnchors(){
    function onClick(e){
      var a = e.target && e.target.closest && e.target.closest('a'); if(!a) return;
      var href = a.getAttribute('href')||'';
      if(!(/wa\.me|whatsapp/.test(href) || /^mailto:/i.test(href))) return;
      e.preventDefault(); e.stopPropagation();
      (async function(){
        var ok = await updateAnchorMsg(a);
        if(ok) window.location.href = a.getAttribute('href');
      })();
    }
    ['click','pointerdown','touchstart'].forEach(function(evt){
      document.addEventListener(evt, onClick, true);
      window.addEventListener(evt, onClick, true);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ hookAll(); interceptAnchors(); });
  } else { hookAll(); interceptAnchors(); }
})();
