
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn()} else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));

    // === Locate fields ===
    const nameInput  = $('#name') || $('#nom') || document.querySelector('input[autocomplete="name"]') || document.querySelector('input[name="name"]');
    const phoneInput = $('#phone') || $('#tel') || document.querySelector('input[type="tel"]');
    const dateInput  = $('#date')  || document.querySelector('input[type="date"]');
    const timeInput  = $('#time')  || document.querySelector('input[type="time"]');
    const startInput = $('#start') || $('#depart') || $('#origin');
    const endInput   = $('#end')   || $('#dest')   || $('#destination');

    const arSel      = document.getElementById('ar') || document.getElementById('allerRetour') || document.querySelector('select#ar, select#allerRetour');
    const attenteYN  = document.getElementById('attente') || document.getElementById('attente_trajet') || document.querySelector('select#attente');
    const attenteH   = document.getElementById('attenteHeures') || document.getElementById('dureeAttente') || document.querySelector('select#attenteHeures, select#dureeAttente');

    // Error helpers
    function ensureHolder(input){
      if(!input) return null;
      let next = input.nextElementSibling;
      if(next && next.classList && (next.classList.contains('field-error') || /error/i.test(next.className))) return next;
      const d = document.createElement('div');
      d.className = 'field-error';
      d.style.color = '#c1121f';
      d.style.fontWeight = '600';
      d.style.marginTop = '6px';
      d.style.display = 'none';
      input.insertAdjacentElement('afterend', d);
      return d;
    }
    const errName  = ensureHolder(nameInput);
    const errPhone = ensureHolder(phoneInput);
    const errDate  = ensureHolder(dateInput);
    const errTime  = ensureHolder(timeInput);
    const errStart = ensureHolder(startInput);
    const errEnd   = ensureHolder(endInput);

    function setErr(input, holder, msg){
      if(!input || !holder) return;
      holder.textContent = msg;
      holder.style.display = 'block';
      input.classList.add('input-invalid');
    }
    function clearErr(input, holder){
      if(holder){ holder.textContent=''; holder.style.display='none'; }
      if(input){ input.classList.remove('input-invalid'); }
    }

    // Helpers time/date
    function todayISO(){
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }
    function nowPlus1(){
      const d = new Date();
      d.setMinutes(d.getMinutes()+1);
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }

    // === Strict validate (no empty + no invalid) ===
    function validateAllStrict(){
      let ok = true;
      function must(input, holder, label){
        const v = (input && input.value||'').trim();
        if(!input || !v){
          setErr(input, holder, `Veuillez renseigner ${label}.`);
          ok = false;
        } else if(input.classList && input.classList.contains('input-invalid')){
          ok = false;
        } else {
          clearErr(input, holder);
        }
      }
      must(nameInput,  errName,  "votre nom et prÃ©noms");
      must(phoneInput, errPhone, "votre numÃ©ro de tÃ©lÃ©phone");
      must(startInput, errStart, "le lieu de dÃ©part");
      must(endInput,   errEnd,   "la destination");
      if(dateInput){
        const v = (dateInput.value||'').trim();
        if(!v){ setErr(dateInput, errDate, "Veuillez sÃ©lectionner une date."); ok=false; }
        else if(v < todayISO()){ setErr(dateInput, errDate, "Cette date est passÃ©e. Merci de choisir une date Ã  partir d'aujourd'hui."); dateInput.value=todayISO(); ok=false; }
        else { clearErr(dateInput, errDate); }
      } else ok=false;

      if(timeInput){
        const v = (timeInput.value||'').trim();
        if(!v){ setErr(timeInput, errTime, "Veuillez choisir une heure."); ok=false; }
        else {
          if(dateInput && dateInput.value === todayISO()){
            const [hh,mm] = v.split(':').map(n=>parseInt(n,10));
            const now = new Date();
            const chosen = new Date();
            chosen.setHours(hh||0, mm||0, 0, 0);
            if(chosen.getTime() <= now.getTime()){
              setErr(timeInput, errTime, "Veuillez choisir une heure plus en avance que l'heure actuelle. Merci pour votre comprÃ©hension.");
              timeInput.value = nowPlus1();
              ok=false;
            }else{ clearErr(timeInput, errTime); }
          }else{ clearErr(timeInput, errTime); }
        }
      } else ok=false;
      return ok;
    }

    // === Estimation (auto si bouton non cliquÃ©) ===
    const RATE = { base:3.75, A:1.03, B:1.55, C:2.06, D:3.06, waitPerH:25 };
    function isNightOrHoliday(dateStr, timeStr){
      if(!timeStr) return false;
      const [h, m] = timeStr.split(':').map(x=>parseInt(x,10));
      const minutes = (h||0)*60 + (m||0);
      const night = (minutes >= 19*60) || (minutes < 7*60);
      if(night) return true;
      const d = new Date(dateStr + 'T' + timeStr);
      const md = (d.getMonth()+1) + '-' + d.getDate();
      const feries = new Set(['1-1','5-1','5-8','7-14','8-15','11-1','11-11','12-25']);
      return feries.has(md);
    }
    function roundTripOn(){ return !!(arSel && /oui/i.test(arSel.value||'')); }
    function waitOn(){ return !!(attenteYN && /oui/i.test(attenteYN.value||'')); }
    function waitHours(){ if(!waitOn()) return 0; const n = parseInt((attenteH && attenteH.value)||'0',10); return (isNaN(n)?0:n); }

    async function getDistanceKm(){
      if(typeof window.__distanceKM === 'number'){ return window.__distanceKM; }
      const el = document.getElementById('distanceKm');
      if(el){
        const val = parseFloat((el.value||el.textContent||'').replace(',','.'));
        if(!isNaN(val) && val>0) return val;
      }
      if(window.google && google.maps && google.maps.DistanceMatrixService){
        return await new Promise((resolve)=>{
          const svc = new google.maps.DistanceMatrixService();
          svc.getDistanceMatrix({
            origins:[startInput.value],
            destinations:[endInput.value],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
          }, (res, status)=>{
            if(status==='OK'){
              const r = res.rows?.[0]?.elements?.[0];
              if(r && r.status==='OK'){
                resolve((r.distance.value||0)/1000);
                return;
              }
            }
            resolve(null);
          });
        });
      }
      return null;
    }

    async function computeEstimate(){
      const km = await getDistanceKm();
      if(km==null || !(km>0)) return null;
      const rt = roundTripOn();
      const night = isNightOrHoliday(dateInput.value, timeInput.value);
      const perKm = rt ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
      const kmTotal = rt ? km*2 : km;
      const waitCost = waitOn() ? (waitHours() * RATE.waitPerH) : 0;
      const price = RATE.base + (kmTotal * perKm) + waitCost;
      return Math.round(price*100)/100;
    }

    function buildSummary(price){
      const lines = [];
      lines.push("Nouvelle rÃ©servation Taxi Li ðŸš•");
      if(nameInput)  lines.push("Nom: " + nameInput.value.trim());
      if(phoneInput) lines.push("TÃ©lÃ©phone: " + phoneInput.value.trim());
      if(dateInput)  lines.push("Date: " + dateInput.value);
      if(timeInput)  lines.push("Heure: " + timeInput.value);
      if(startInput) lines.push("DÃ©part: " + startInput.value.trim());
      if(endInput)   lines.push("Destination: " + endInput.value.trim());
      lines.push("Aller/retour: " + (roundTripOn() ? "Oui" : "Non"));
      if(waitOn())  lines.push("Attente: Oui (" + waitHours() + " h)");
      if(price!=null) lines.push("Estimation: " + price.toFixed(2) + " â‚¬");
      else lines.push("Estimation: (indisponible)");
      lines.push("â€”");
      lines.push("Message envoyÃ© depuis le formulaire en ligne.");
      return lines.join("\n");
    }

    // === Global click guard (captures ALL clicks on page) ===
    function isReserveAction(el){
      if(!el) return false;
      const txt = (el.textContent||'').toLowerCase();
      const href = (el.getAttribute && el.getAttribute('href')) || '';
      return /rÃ©server par whatsapp|rÃ©server par e-?mail/.test(txt) || (href.includes('wa.me') || href.startsWith('mailto:'));
    }

    document.addEventListener('click', async function(e){
      const target = e.target.closest('a,button');
      if(!target) return;
      if(!isReserveAction(target)) return;

      // Always validate strictly
      const ok = validateAllStrict();
      if(!ok){ e.preventDefault(); e.stopPropagation(); return; }

      // Compute estimate automatically even if user never clicked the "Estimation du prix" button
      e.preventDefault(); e.stopPropagation();
      const price = await computeEstimate();
      const summary = buildSummary(price);

      // Determine destination from element
      const href = (target.getAttribute('href')||'');
      if(href.includes('wa.me') || /whatsapp/.test((target.textContent||'').toLowerCase())){
        let base = href || 'https://wa.me/';
        base = base.replace(/(\?|&)text=[^&]*/,'').replace(/&$/,'');
        const sep = base.includes('?') ? '&' : '?';
        const url = base + sep + 'text=' + encodeURIComponent(summary);
        window.location.href = url;
      }else{
        let base = href || 'mailto:taxili@laposte.net';
        const sep = base.includes('?') ? '&' : '?';
        const subject = 'RÃ©servation Taxi Li â€“ ' + (nameInput?nameInput.value.trim():'Client');
        const url = base + sep + 'subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(summary);
        window.location.href = url;
      }
    }, true); // capture
  });
})();
