
/* TaxiLI — Email Gate Sequence v2 (FORCED KM)
   Only for "Réserver par e-mail":
   1) Show "Calcul..." in estimate field
   2) Force full estimation (KM via cache -> #distanceKm -> Google Distance Matrix)
   3) Write estimate into #estimateOut (and dataset.value)
   4) Open email ONLY IF estimate is visible & valid
*/
(function(){
  if(window.__EMAIL_GATE_SEQ_V2__) return; window.__EMAIL_GATE_SEQ_V2__ = true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value || el.textContent) || '').trim(); }
  function num(v){ v = String(v).replace(',','.'); var n = parseFloat(v); return isFinite(n) ? n : NaN; }
  function eur(n){ return n.toFixed(2).replace('.', ',') + ' €'; }

  const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };

  function isEmailTrigger(el){
    if(!el) return false;
    var a = el.closest && el.closest('a,button');
    if(!a) return false;
    var label = (a.innerText || a.textContent || '').toLowerCase();
    var mailHref = (a.getAttribute && a.getAttribute('href')) || '';
    if(/^mailto:/i.test(mailHref)) return true;
    if(label.includes('réserver par e-mail') || label.includes('reserver par e-mail') ||
       label.includes('réserver par email') || label.includes('reserver par email')) return true;
    if(a.hasAttribute('data-action') && a.getAttribute('data-action')==='mail') return true;
    if(a.id === 'mailBtn' || (a.classList && a.classList.contains('btn-mail'))) return true;
    return false;
  }

  function selectedHour(){
    var t = tv($('#time') || document.querySelector('input[type="time"]'));
    if(!t) return NaN;
    var h = parseInt((t.split(':')[0]||''),10);
    return isFinite(h)?h:NaN;
  }
  function isNight(h){ return (h<7 || h>=19); }

  function roundTripOn(){
    var el = $('#roundtrip') || $('#allerRetour') || $('#ar') || document.querySelector('[name="roundtrip"]');
    if(!el) return false;
    if(el.tagName==='SELECT') return /^oui$/i.test(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    var v = (el.value||el.textContent||'').trim().toLowerCase();
    return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on');
  }
  function waitOn(){
    var el = $('#waitOnTrip') || $('#attente') || $('#waitDuring') || $('#attente_trajet');
    if(!el) return false;
    if(el.tagName==='SELECT') return /^oui$/i.test(el.value);
    if(el.type==='checkbox'||el.type==='radio') return !!el.checked;
    var aria = el.getAttribute && el.getAttribute('aria-pressed');
    if(aria!=null) return String(aria).toLowerCase()==='true';
    if(el.classList && el.classList.contains('active')) return true;
    var v = (el.value||el.textContent||'').trim().toLowerCase();
    return (v==='oui'||v==='yes'||v==='1'||v==='true'||v==='on');
  }
  function waitHours(){
    var el = $('#waitHours') || $('#attenteHeures') || $('#dureeAttente');
    var n = num(tv(el)||'0');
    return isFinite(n) ? n : 0;
  }

  async function getKm(){
    if(typeof window.__distanceKM === 'number' && window.__distanceKM>0) return window.__distanceKM;
    var el = $('#distanceKm');
    if(el){
      var n = num(el.value || el.textContent || '');
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
              { origins:[start], destinations:[end], travelMode:google.maps.TravelMode.DRIVING, unitSystem:google.maps.UnitSystem.METRIC },
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

  function computePrice(km, night, rt){
    var perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
    var kmTotal = rt ? km*2 : km;
    var price = RATE.base + (kmTotal * perKm) + (waitOn()? waitHours()*RATE.waitPerH : 0);
    return Math.round(price*100)/100;
  }

  function writeEstimate(n){
    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(!out || !isFinite(n)) return false;
    out.textContent = eur(n);
    try{ out.dataset.value = String(n); }catch(e){}
    return true;
  }

  function buildBody(price){
    var L = [];
    function g(sel){ return tv(document.querySelector(sel)); }
    var name  = g('#name') || g('#nom') || g('input[autocomplete="name"]') || g('input[name="name"]');
    var tel   = g('#phone')|| g('#tel') || g('input[type="tel"]');
    var date  = g('#date') || g('input[type="date"]');
    var time  = g('#time') || g('input[type="time"]');
    var dep   = g('#start')|| g('#depart') || g('#origin');
    var dst   = g('#end')  || g('#dest')   || g('#destination');
    var notes = g('#notes')|| g('textarea[name="notes"]') || g('textarea[placeholder*="note" i]');
    var rt    = roundTripOn();

    L.push("Nouvelle réservation Taxi LI 🚕");
    if(name) L.push("Nom: " + name);
    if(tel)  L.push("Téléphone: " + tel);
    if(date) L.push("Date: " + date);
    if(time) L.push("Heure: " + time);
    if(dep)  L.push("Départ: " + dep);
    if(dst)  L.push("Destination: " + dst);
    L.push("Aller/retour: " + (rt ? "Oui" : "Non"));
    if(notes) L.push("Notes: " + notes);
    L.push("Estimation: " + (isFinite(price) ? eur(price) : "(indisponible)"));
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  function findMailto(){
    var a = document.querySelector('a[href^="mailto:"]');
    if(a){
      var href = a.getAttribute('href')||'';
      return href.split('?')[0];
    }
    return 'mailto:taxili@laposte.net';
  }

  async function onTrigger(e){
    var trg = e.target && e.target.closest && e.target.closest('a,button');
    if(!isEmailTrigger(trg)) return;
    e.preventDefault();

    var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
    if(out){ out.textContent = "Calcul..."; }

    var hh = selectedHour();
    if(!isFinite(hh)){
      if(out){ out.textContent = ""; }
      var tf = $('#time') || document.querySelector('input[type="time"]');
      if(tf){ tf.focus(); }
      return; // do not open email
    }

    var km = await getKm();
    if(!(km>0)){
      if(out){ out.textContent = ""; }
      // focus destination field to help the user
      var dest = $('#end') || $('#dest') || $('#destination');
      if(dest && dest.focus) dest.focus();
      return;
    }

    var price = computePrice(km, isNight(hh), roundTripOn());
    var ok = writeEstimate(price);
    if(!ok) return; // gate: do not open email

    var body = buildBody(price);
    var mailto = 'mailto:';
    var href = (trg.getAttribute && trg.getAttribute('href')) || '';
    var params = new URLSearchParams();
    if(/^mailto:/i.test(href)){
      var parts = href.split('?'); mailto = parts[0]; params = new URLSearchParams(parts[1]||'');
    } else {
      mailto = findMailto();
    }
    if(!params.has('subject')) params.set('subject','Demande de réservation taxi');
    params.set('body', body);

    var url = mailto + '?' + params.toString();
    if(trg.tagName && trg.tagName.toLowerCase()==='a'){ trg.setAttribute('href', url); }
    window.location.href = url;
  }

  ['click','pointerdown','touchstart'].forEach(function(ev){
    document.addEventListener(ev, onTrigger, true);
    window.addEventListener(ev, onTrigger, true);
  });
})();
