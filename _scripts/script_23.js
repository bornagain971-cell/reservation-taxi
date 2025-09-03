
(function(){
  function onReady(fn){ if(document.readyState!=='loading'){fn()} else document.addEventListener('DOMContentLoaded',fn,{once:true}); }

  onReady(function(){
    const WA_NUMBER = '590691280005';
    const q  = (s)=>document.querySelector(s);
    const qq = (s)=>Array.from(document.querySelectorAll(s));

    // Helpers to build summary (no estimation here; only for quick button simple greeting if needed)
    function v(sel){ const el=document.querySelector(sel); return el? (el.value||'').trim():''; }
    function buildSummary(){
      const L=[];
      const name  = v('#name') || v('#nom') || v('input[autocomplete="name"]') || v('input[name="name"]');
      const tel   = v('#phone')|| v('#tel') || v('input[type="tel"]');
      const date  = v('#date') || v('input[type="date"]');
      const time  = v('#time') || v('input[type="time"]');
      const dep   = v('#start')|| v('#depart')|| v('#origin');
      const dst   = v('#end')  || v('#dest')  || v('#destination');
      // Quick contact should be plain; no summary
      return "";
    }

    // 1) QUICK BUTTON: always plain link to number, no validation, no text
    function isQuick(el){
      if(!el) return false;
      const txt = (el.textContent||'').toLowerCase();
      const href = (el.getAttribute('href')||'');
      return (el.dataset && el.dataset.plainWa==='1') || (href.startsWith('https://wa.me/') && !(txt.includes('rÃ©server par whatsapp')||txt.includes('reserver par whatsapp')));
    }
    function quickHandler(ev){
      const el = ev.target.closest('a');
      if(!el || !isQuick(el)) return;
      // open plain number, remove any ?text
      ev.stopImmediatePropagation();
      ev.preventDefault(); // we'll navigate ourselves to strip any query
      const base = 'https://wa.me/'+WA_NUMBER;
      window.location.href = base;
    }

    // 2) RESERVE BY WA: strict validation + estimation + greeting + summary to your number
    function isReserve(el){
      if(!el) return false;
      const txt = (el.textContent||'').toLowerCase();
      return txt.includes('rÃ©server par whatsapp') || txt.includes('reserver par whatsapp');
    }

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

    function validateAllStrict(){
      const name  = q('#name') || q('#nom') || document.querySelector('input[autocomplete="name"], input[name="name"]');
      const phone = q('#phone')|| q('#tel') || document.querySelector('input[type="tel"]');
      const dateI = q('#date') || document.querySelector('input[type="date"]');
      const timeI = q('#time') || document.querySelector('input[type="time"]');
      const start = q('#start')|| q('#depart')|| q('#origin');
      const end   = q('#end')  || q('#dest')  || q('#destination');

      let ok = true;
      const pairs = [
        [name,  ensureHolder(name),  "votre nom et prÃ©noms"],
        [phone, ensureHolder(phone), "votre numÃ©ro de tÃ©lÃ©phone"],
        [start, ensureHolder(start), "le lieu de dÃ©part"],
        [end,   ensureHolder(end),   "la destination"],
      ];
      pairs.forEach(([el,h,label])=>{
        const v = el && (el.value||'').trim();
        if(!el || !v){ setErr(el,h,`Veuillez renseigner ${label}.`); ok=false; }
        else if(el.classList && el.classList.contains('input-invalid')) ok=false;
        else clearErr(el,h);
      });

      const errD = ensureHolder(dateI), errT = ensureHolder(timeI);
      if(dateI){
        const v=(dateI.value||'').trim();
        if(!v){ setErr(dateI, errD, "Veuillez sÃ©lectionner une date."); ok=false; }
        else if(v < todayISO()){ setErr(dateI, errD, "Cette date est passÃ©e. Merci de choisir une date Ã  partir d'aujourd'hui."); dateI.value=todayISO(); ok=false; }
        else clearErr(dateI, errD);
      } else ok=false;
      if(timeI){
        const v=(timeI.value||'').trim();
        if(!v){ setErr(timeI, errT, "Veuillez choisir une heure."); ok=false; }
        else if(dateI && dateI.value === todayISO()){
          const [hh,mm] = v.split(':').map(x=>parseInt(x||'0',10));
          const now = new Date(), chosen = new Date(); chosen.setHours(hh||0, mm||0, 0, 0);
          if(chosen <= now){ setErr(timeI, errT, "Veuillez choisir une heure plus en avance que l'heure actuelle. Merci pour votre comprÃ©hension."); timeI.value=nowPlus1(); ok=false; }
          else clearErr(timeI, errT);
        } else clearErr(timeI, errT);
      } else ok=false;
      return ok;
    }

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
    function roundTripOn(){
      const arSel = document.getElementById('ar') || document.getElementById('allerRetour') || document.querySelector('select#ar, select#allerRetour');
      const v = arSel && (arSel.value||''); return /oui/i.test(v||'');
    }
    function waitOn(){
      const att = document.getElementById('attente') || document.getElementById('attente_trajet') || document.querySelector('select#attente');
      const v = att && (att.value||''); return /oui/i.test(v||'');
    }
    function waitHours(){
      if(!waitOn()) return 0;
      const sel = document.getElementById('attenteHeures') || document.getElementById('dureeAttente') || document.querySelector('select#attenteHeures, select#dureeAttente');
      const n = parseInt((sel && sel.value)||'0',10);
      return isNaN(n)?0:n;
    }

    async function getDistanceKm(){
      if(typeof window.__distanceKM === 'number') return window.__distanceKM;
      const el = document.getElementById('distanceKm');
      if(el){
        const val = parseFloat((el.value||el.textContent||'').replace(',','.'));
        if(!isNaN(val) && val>0) return val;
      }
      if(window.google && google.maps && google.maps.DistanceMatrixService){
        const origin = v('#start')||v('#depart')||v('#origin');
        const dest   = v('#end')  ||v('#dest')  ||v('#destination');
        if(origin && dest){
          return await new Promise((resolve)=>{
            const svc = new google.maps.DistanceMatrixService();
            svc.getDistanceMatrix({
              origins:[origin],
              destinations:[dest],
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
      }
      return null;
    }

    async function computeEstimate(){
      const km = await getDistanceKm();
      if(!(km>0)) return null;
      const night = isNightOrHoliday(v('#date')||'', v('#time')||'');
      const perKm = roundTripOn() ? (night ? RATE.B : RATE.A) : (night ? RATE.D : RATE.C);
      const kmTotal = roundTripOn() ? km*2 : km;
      const waitCost = waitOn() ? (waitHours()*RATE.waitPerH) : 0;
      const price = RATE.base + kmTotal*perKm + waitCost;
      return Math.round(price*100)/100;
    }

    function buildReserveSummary(price){
      const L=[];
      L.push("Bonjour Taxi Li, je souhaite rÃ©server une course.");
      L.push("");
      L.push("Nouvelle rÃ©servation Taxi Li ðŸš•");
      const name  = v('#name') || v('#nom') || v('input[autocomplete="name"]') || v('input[name="name"]');
      const tel   = v('#phone')|| v('#tel') || v('input[type="tel"]');
      const date  = v('#date') || v('input[type="date"]');
      const time  = v('#time') || v('input[type="time"]');
      const dep   = v('#start')|| v('#depart')|| v('#origin');
      const dst   = v('#end')  || v('#dest')  || v('#destination');
      if(name) L.push("Nom: "+name);
      if(tel)  L.push("TÃ©lÃ©phone: "+tel);
      if(date) L.push("Date: "+date);
      if(time) L.push("Heure: "+time);
      if(dep)  L.push("DÃ©part: "+dep);
      if(dst)  L.push("Destination: "+dst);
      L.push("Aller/retour: " + (roundTripOn() ? "Oui" : "Non"));
      if(waitOn()) L.push("Attente: Oui ("+ waitHours() +" h)");
      if(price!=null) L.push("Estimation: " + price.toFixed(2) + " â‚¬");
      else L.push("Estimation: (indisponible)");
      L.push("â€”");
      L.push("Message envoyÃ© depuis le formulaire en ligne.");
      return L.join("\n");
    }

    function quickListener(ev){
      const el = ev.target.closest('a');
      if(!el) return;
      if(isQuick(el)) quickHandler(ev);
    }
    async function reserveListener(ev){
      const el = ev.target.closest('a,button');
      if(!el) return;
      if(!isReserve(el)) return;
      ev.stopImmediatePropagation();
      ev.preventDefault();
      if(!validateAllStrict()) return;
      const price = await computeEstimate();
      const msg = buildReserveSummary(price);
      const url = 'https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(msg);
      window.location.href = url;
    }

    // Attach listeners EARLY and in capture
    ['click','pointerdown','touchstart'].forEach(evt=>{
      document.addEventListener(evt, quickListener, true);
      document.addEventListener(evt, reserveListener, true);
      window.addEventListener(evt, quickListener, true);
      window.addEventListener(evt, reserveListener, true);
    });
  });
})();
