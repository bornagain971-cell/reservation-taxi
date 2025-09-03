
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn()} else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    const $ = sel => document.querySelector(sel);
    const $all = sel => Array.from(document.querySelectorAll(sel));
    const dateInput  = $('#date') || document.querySelector('input[type="date"]');
    const timeInput  = $('#time') || document.querySelector('input[type="time"]');

    // Force heure actuelle + 1 minute dÃ¨s le dÃ©marrage
    function nowPlus1(){
      const d = new Date();
      d.setMinutes(d.getMinutes()+1);
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }
    if(timeInput){
      timeInput.value = nowPlus1();
    }

    // Helper today ISO
    function todayISO(){
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if(dateInput){
      try{ dateInput.min = todayISO(); }catch(_){}
    }

    // Error helpers
    function ensureHolder(input){
      if(!input) return null;
      let next = input.nextElementSibling;
      if(next && next.classList && next.classList.contains('field-error')) return next;
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

    // Locate fields robustly
    const nameInput  = $('#name') || $('#nom') || document.querySelector('input[name="name"]') || document.querySelector('input[autocomplete="name"]');
    const phoneInput = $('#phone') || $('#tel') || document.querySelector('input[type="tel"]');
    const startInput = $('#start') || $('#depart') || $('#origin');
    const endInput   = $('#end')   || $('#dest')   || $('#destination');

    const errName  = ensureHolder(nameInput);
    const errPhone = ensureHolder(phoneInput);
    const errDate  = ensureHolder(dateInput);
    const errTime  = ensureHolder(timeInput);
    const errStart = ensureHolder(startInput);
    const errEnd   = ensureHolder(endInput);

    // Strict validator used on every click
    function validateAllStrict(){
      let ok = true;

      function requireFilled(input, holder, label){
        const v = (input && input.value || '').trim();
        if(!input || !v){
          setErr(input, holder, `Veuillez renseigner ${label}.`);
          ok = false;
        } else if (input.classList && input.classList.contains('input-invalid')){
          // dÃ©jÃ  marquÃ© invalide par les rÃ¨gles live
          ok = false;
        } else {
          clearErr(input, holder);
        }
      }

      requireFilled(nameInput,  errName,  "votre nom et prÃ©noms");
      requireFilled(phoneInput, errPhone, "votre numÃ©ro de tÃ©lÃ©phone");
      requireFilled(startInput, errStart, "le lieu de dÃ©part");
      requireFilled(endInput,   errEnd,   "la destination");

      // Date
      if(dateInput){
        const v = (dateInput.value||'').trim();
        if(!v){
          setErr(dateInput, errDate, "Veuillez sÃ©lectionner une date.");
          ok = false;
        } else if(v < todayISO()){
          setErr(dateInput, errDate, "Cette date est passÃ©e. Merci de choisir une date Ã  partir d'aujourd'hui.");
          dateInput.value = todayISO();
          ok = false;
        } else {
          clearErr(dateInput, errDate);
        }
      }else{ ok = false; }

      // Time
      if(timeInput){
        const v = (timeInput.value||'').trim();
        if(!v){
          setErr(timeInput, errTime, "Veuillez choisir une heure.");
          ok = false;
        } else {
          // si aujourd'hui : v doit Ãªtre > maintenant
          const today = todayISO();
          if(dateInput && dateInput.value === today){
            const now = new Date();
            const [hh, mm] = v.split(':').map(n=>parseInt(n,10));
            const chosen = new Date();
            chosen.setHours(hh||0, mm||0, 0, 0);
            if(chosen.getTime() <= now.getTime()){
              setErr(timeInput, errTime, "Veuillez choisir une heure plus en avance que l'heure actuelle. Merci pour votre comprÃ©hension.");
              timeInput.value = nowPlus1();
              ok = false;
            }else{
              clearErr(timeInput, errTime);
            }
          }else{
            clearErr(timeInput, errTime);
          }
        }
      }else{ ok = false; }

      return ok;
    }

    // Bind on every click (capture) for WA + Mail buttons
    const all = $all('a,button');
    const isReserveAction = (el) => /rÃ©server par whatsapp|rÃ©server par e-?mail/i.test((el.textContent||'')) || 
                                    (el.href||'').includes('wa.me') || 
                                    (el.href||'').startsWith('mailto:');
    all.forEach(el=>{
      if(!isReserveAction(el)) return;
      el.addEventListener('click', function(e){
        const ok = validateAllStrict();
        if(!ok){ e.preventDefault(); e.stopPropagation(); }
      }, true); // capture
    });
  });
})();
