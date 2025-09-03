
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn()} else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    const $ = sel => document.querySelector(sel);
    const $all = sel => Array.from(document.querySelectorAll(sel));

    // ---- Helpers to find fields (id, label, placeholder) ----
    const N = s => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');

    function findByLabel(txt){
      txt = N(txt);
      const labels = $all('label');
      for(const lb of labels){
        const t = N(lb.textContent);
        if(t.includes(txt)){
          if(lb.htmlFor){
            const el = document.getElementById(lb.htmlFor);
            if(el) return el;
          }
          const el = lb.querySelector('input,textarea,select') || lb.parentElement && lb.parentElement.querySelector('input,textarea,select');
          if(el) return el;
        }
      }
      return null;
    }
    function findByPlaceholder(part){
      part = N(part);
      const inputs = $all('input,textarea');
      return inputs.find(el => N(el.getAttribute('placeholder')||'').includes(part)) || null;
    }

    // Core fields
    const nameInput  = $('#name') || findByLabel('nom') || findByPlaceholder('nom');
    const phoneInput = $('#phone') || findByLabel('tele') || findByPlaceholder('tel') || findByPlaceholder('phone');
    const dateInput  = $('#date') || document.querySelector('input[type="date"]') || findByLabel('date');
    const timeInput  = $('#time') || document.querySelector('input[type="time"]') || findByLabel('heure');
    const startInput = $('#start') || findByLabel('lieu de depart') || findByPlaceholder('depart') || $('#depart') || $('#origin');
    const endInput   = $('#end')   || findByLabel('destination')   || findByPlaceholder('destination') || $('#dest') || $('#destination');

    // Buttons WhatsApp / Email (find by text or href)
    function findActions(){
      const all = $all('a,button');
      const wa = all.find(el => /rÃ©server par whatsapp/i.test((el.textContent||''))) || all.find(el => (el.href||'').includes('wa.me'));
      const mail = all.find(el => /rÃ©server par e-?mail/i.test((el.textContent||''))) || all.find(el => (el.href||'').startsWith('mailto:'));
      return {wa, mail};
    }
    const actions = findActions();

    // Utility: create error holder under a field if missing
    function ensureErrorHolder(input){
      if(!input) return null;
      const next = input.nextElementSibling;
      if(next && next.classList && next.classList.contains('field-error')) return next;
      const d = document.createElement('div');
      d.className = 'field-error';
      d.style.display = 'none';
      input.insertAdjacentElement('afterend', d);
      return d;
    }

    const errName  = ensureErrorHolder(nameInput);
    const errPhone = ensureErrorHolder(phoneInput);
    const errDate  = ensureErrorHolder(dateInput);
    const errTime  = ensureErrorHolder(timeInput);
    const errStart = ensureErrorHolder(startInput);
    const errEnd   = ensureErrorHolder(endInput);

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

    // ---- Name: alphabetic with accents, spaces, hyphens, apostrophes ----
    if(nameInput){
      nameInput.addEventListener('input', () => {
        const before = nameInput.value;
        const cleaned = before.replace(/[^A-Za-zÃ€-Ã–Ã˜-Ã¶Ã¸-Ã¿' -]/g, '');
        nameInput.value = cleaned;
        if(before !== cleaned){
          setErr(nameInput, errName, "Veuillez saisir un nom et des prÃ©noms sans chiffres ni caractÃ¨res spÃ©ciaux. Merci !");
        } else if(cleaned.trim()===''){
          setErr(nameInput, errName, "Veuillez saisir votre nom et prÃ©noms.");
        } else {
          clearErr(nameInput, errName);
        }
      });
    }

    // ---- Phone: numeric; allow '+' only (preferably at first char) ----
    if(phoneInput){
      phoneInput.addEventListener('input', () => {
        const before = phoneInput.value;
        // keep digits; allow a single leading '+'
        let cleaned = before.replace(/[^\d+]/g, '');
        if(cleaned.indexOf('+') > 0){ cleaned = cleaned.replace(/\+/g,''); } // '+' only at start
        if((cleaned.match(/\+/g)||[]).length > 1){ cleaned = cleaned.replace(/\+/g,''); }
        phoneInput.value = cleaned;
        if(before !== cleaned){
          setErr(phoneInput, errPhone, "Veuillez saisir un numÃ©ro valide (chiffres uniquement, Â« + Â» autorisÃ© en dÃ©but).");
        } else if(cleaned.trim()===''){
          setErr(phoneInput, errPhone, "Veuillez saisir votre numÃ©ro de tÃ©lÃ©phone.");
        } else {
          clearErr(phoneInput, errPhone);
        }
      });
    }

    // ---- Date: min = today; past dates disabled visually ----
    function todayISO(){
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if(dateInput){
      try{
        dateInput.min = todayISO();
      }catch(_){}
      dateInput.addEventListener('change', () => {
        const v = dateInput.value;
        if(!v){
          setErr(dateInput, errDate, "Veuillez sÃ©lectionner une date.");
          return;
        }
        if(v < todayISO()){
          setErr(dateInput, errDate, "Cette date est passÃ©e. Merci de choisir une date Ã  partir d'aujourd'hui.");
          // Auto-correct to today
          dateInput.value = todayISO();
        } else {
          clearErr(dateInput, errDate);
        }
      });
    }

    // ---- Time: default now + 1 minute; if <= now when date = today -> reset and error ----
    function nowPlus1(){
      const d = new Date();
      d.setMinutes(d.getMinutes()+1);
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }
    function isTodaySelected(){
      if(!dateInput || !dateInput.value) return false;
      return dateInput.value === todayISO();
    }
    if(timeInput){
      // init default
      if(!timeInput.value){ timeInput.value = nowPlus1(); }
      // validate on change
      timeInput.addEventListener('change', () => {
        const v = timeInput.value;
        if(!v){ setErr(timeInput, errTime, "Veuillez choisir une heure."); return; }
        if(isTodaySelected()){
          const now = new Date();
          const [hh, mm] = v.split(':').map(n=>parseInt(n,10));
          const chosen = new Date();
          chosen.setHours(hh||0, mm||0, 0, 0);
          if(chosen.getTime() <= now.getTime()){
            setErr(timeInput, errTime, "Veuillez choisir une heure plus en avance que l'heure actuelle. Merci pour votre comprÃ©hension.");
            // reset to now + 1
            timeInput.value = nowPlus1();
            return;
          }
        }
        clearErr(timeInput, errTime);
      });
    }

    // ---- Start/End empty errors on input ----
    function bindRequired(input, holder, label){
      if(!input) return;
      input.addEventListener('input', () => {
        const v = (input.value||'').trim();
        if(!v){ setErr(input, holder, "Veuillez renseigner " + label + "."); }
        else { clearErr(input, holder); }
      });
    }
    bindRequired(startInput, errStart, "le lieu de dÃ©part");
    bindRequired(endInput, errEnd, "la destination");

    // ---- Guard on WhatsApp / Email buttons ----
    function validateAll(showMessages){
      const missing = [];

      function req(input, holder, label, test){
        const v = (input && input.value||'').trim();
        if(!input){
          return;
        }
        if(!v){ missing.push(label); if(showMessages) setErr(input, holder, "Veuillez renseigner " + label + "."); return; }
        if(test && !test()){ missing.push(label); }
      }

      req(nameInput,  errName,  "nom et prÃ©noms", () => !nameInput.classList.contains('input-invalid'));
      req(phoneInput, errPhone, "tÃ©lÃ©phone", () => !phoneInput.classList.contains('input-invalid'));
      req(dateInput,  errDate,  "date", () => !dateInput.classList.contains('input-invalid'));
      req(timeInput,  errTime,  "heure", () => !timeInput.classList.contains('input-invalid'));
      req(startInput, errStart, "le lieu de dÃ©part");
      req(endInput,   errEnd,   "la destination");

      // Si heure aujourd'hui <= maintenant, marquer erreur
      if(timeInput && dateInput && dateInput.value === todayISO()){
        const v = timeInput.value||'';
        if(v){
          const [hh,mm] = v.split(':').map(n=>parseInt(n,10));
          const now = new Date();
          const chosen = new Date();
          chosen.setHours(hh||0, mm||0, 0, 0);
          if(chosen.getTime() <= now.getTime()){
            setErr(timeInput, errTime, "Veuillez choisir une heure plus en avance que l'heure actuelle. Merci pour votre comprÃ©hension.");
            missing.push("heure");
          }
        }
      }

      return missing;
    }

    function guardClick(e){
      const miss = validateAll(true);
      if(miss.length){
        e.preventDefault(); e.stopPropagation();
      }
    }

    const allBtns = $all('a,button');
    const wa = allBtns.find(el => /rÃ©server par whatsapp/i.test((el.textContent||''))) || allBtns.find(el => (el.href||'').includes('wa.me'));
    const mail = allBtns.find(el => /rÃ©server par e-?mail/i.test((el.textContent||''))) || allBtns.find(el => (el.href||'').startsWith('mailto:'));
    if(wa)   wa.addEventListener('click', guardClick, true);
    if(mail) mail.addEventListener('click', guardClick, true);

    // Initial clean of hour error
    if(errTime){ errTime.style.display='none'; errTime.textContent=''; }
  });
})();
