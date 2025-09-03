
/* TaxiLI — Email strict sequence: display estimate FIRST, then open email with same value */
(function(){
  if (window.__EMAIL_SEQ_STRICT__) return; window.__EMAIL_SEQ_STRICT__=true;
  function $(s){return document.querySelector(s);}
  function tv(el){return (el && (el.value||el.textContent)||'').trim();}
  function num(v){ var n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:0; }
  function eur(n){return n.toFixed(2).replace('.',',')+' €';}

  const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };

  function isNightByTimeStr(t){
    if(!t) return null;
    var h = parseInt(String(t).split(':')[0]||'NaN',10);
    if(!isFinite(h)) return null;
    return (h<7 || h>=19);
  }
  function roundTripOn(){
    var el = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return /^oui$/i.test(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    var v = (el.value||el.textContent||'').trim();
    return /^oui|on|true|1$/i.test(v);
  }
  function waitOn(){ 
    var el = $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet');
    if(!el) return false;
    if(el.tagName==='SELECT') return /^oui$/i.test(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    return /^oui|on|true|1$/i.test((el.value||el.textContent||'').trim());
  }
  function waitHours(){ 
    var el = $('#waitHours') || $('#attenteHeures') || $('#dureeAttente');
    return num(tv(el)||'0');
  }

  async function getKm(){
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    var el = $('#distanceKm');
    if(el){
      var val = num(el.value||el.textContent||'0');
      if(val>0){ window.__distanceKM=val; return val; }
    }
    // Google Distance Matrix
    try{
      if(window.google && google.maps && google.maps.DistanceMatrixService){
        var start = tv($('#start')||$('#depart')||$('#origin'));
        var end   = tv($('#end')||$('#dest')  ||$('#destination'));
        if(start && end){
          var svc = new google.maps.DistanceMatrixService();
          var km = await new Promise(function(resolve){
            svc.getDistanceMatrix({origins:[start],destinations:[end],travelMode:google.maps.TravelMode.DRIVING,unitSystem:google.maps.UnitSystem.METRIC},
              function(res,status){
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

  function computePrice(km, night, rt){
    var perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
    var kmTotal = rt ? km*2 : km;
    var price = RATE.base + (kmTotal * perKm) + (waitOn()? waitHours()*RATE.waitPerH : 0);
    return Math.round(price*100)/100;
  }

  function buildEmailBody(price){
    var L=[];
    function g(sel){return tv(document.querySelector(sel));}
    var name  = g('#name')||g('#nom')||g('input[autocomplete="name"]')||g('input[name="name"]');
    var tel   = g('#phone')||g('#tel')||g('input[type="tel"]');
    var date  = g('#date') || g('input[type="date"]');
    var time  = g('#time') || g('input[type="time"]');
    var dep   = g('#start')||g('#depart')||g('#origin');
    var dst   = g('#end')  ||g('#dest')  ||g('#destination');
    var notes = g('#notes')||g('textarea[name="notes"]')||g('textarea[placeholder*="note" i]');

    L.push("Nouvelle réservation Taxi LI 🚕");
    if(name) L.push("Nom: " + name);
    if(tel)  L.push("Téléphone: " + tel);
    if(date) L.push("Date: " + date);
    if(time) L.push("Heure: " + time);
    if(dep)  L.push("Départ: " + dep);
    if(dst)  L.push("Destination: " + dst);
    L.push("Passagers: " + (g('#passengers')||'') + " | Bagages: " + (g('#baggages')||''));
    L.push("Aller/retour: " + (roundTripOn() ? "Oui" : "Non") + " | Attente: " + (waitOn() ? "Oui ("+waitHours()+"h)" : "Non"));
    L.push("Siège enfant: " + (/oui/i.test(g('#childSeat')||'non') ? "Oui" : "Non"));
    if(notes) L.push("Notes: " + notes);
    L.push("Estimation: " + (isFinite(price)? eur(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  async function handleEmail(e){
    const trigger = e.target && e.target.closest && e.target.closest('a[href^=\"mailto:\"], [data-action=\"mail\"], #mailBtn, .btn-mail, button[data-role=\"mail\"], form[data-reserve=\"email\"]');
    if(!trigger) return;
    e.preventDefault();

    // 1) Show "Calcul..." immediately
    const out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out){ out.textContent = "Calcul..."; }

    // 2) Make sure time exists
    var tStr = tv($('#time') || document.querySelector('input[type="time"]'));
    var night = isNightByTimeStr(tStr);
    if(night===null){
      if(out){ out.textContent = ""; }
      // if time missing, focus it and stop
      var tf = $('#time') || document.querySelector('input[type="time"]');
      if(tf){ tf.focus(); }
      return;
    }

    // 3) Get KM
    var km = await getKm();
    // 4) Compute and WRITE visibly
    var price = (km>0) ? computePrice(km, night, roundTripOn()) : NaN;
    if(out){ out.textContent = isFinite(price) ? eur(price) : ""; if(isFinite(price)){ try{ out.dataset.value=String(price) }catch(e){} } }

    // 5) Compose email body
    var body = buildEmailBody(price);

    // 6) Build mailto and navigate
    var href = (trigger.getAttribute && trigger.getAttribute('href')) || '';
    var mailto = 'mailto:taxili@laposte.net', params = new URLSearchParams();
    if(/^mailto:/i.test(href)){
      var parts = href.split('?'); mailto = parts[0]; params = new URLSearchParams(parts[1]||'');
    } else {
      // try to find a default mailto in the page
      var a = document.querySelector('a[href^=\"mailto:\"]');
      if(a){
        var raw = a.getAttribute('href')||'';
        mailto = raw.split('?')[0];
      }
    }
    if(!params.has('subject')) params.set('subject','Demande de réservation taxi');
    params.set('body', body);
    var url = mailto + '?' + params.toString();
    if(trigger.tagName && trigger.tagName.toLowerCase()==='a'){ trigger.setAttribute('href', url); }
    window.location.href = url;
  }

  ['click','pointerdown','touchstart'].forEach(function(ev){
    document.addEventListener(ev, handleEmail, true);
    window.addEventListener(ev, handleEmail, true);
  });
  document.addEventListener('submit', function(e){
    const f=e.target;
    if(f && (f.matches('form[data-reserve=\"email\"], form#reserveEmail, form.mail-reserve'))){
      handleEmail(e);
    }
  }, true);
})();
