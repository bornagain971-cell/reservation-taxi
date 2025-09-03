
(function(){
  function ready(fn){ if(document.readyState!=='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  ready(function(){
    var confirmBtn = document.getElementById('confirmBtn') || document.querySelector('button[data-role="confirm"], .btn-confirm');
    if(!confirmBtn) return;

    var nameEl  = document.querySelector('#name, input[name="name"], #fullname, #fullName');
    var phoneEl = document.querySelector('#phone, input[name="phone"], #tel, input[type="tel"]');
    var depEl   = document.querySelector('#start, #depart, #origin, input[name="origin"], input[name="start"]');
    var dstEl   = document.querySelector('#end, #destination, #dest, input[name="destination"]');
    var dateEl  = document.querySelector('#date, input[type="date"]');

    function isEmpty(el){ return !el || !String(el.value||'').trim(); }

    function ensureErr(el, idSuffix, msg){
      if(!el) return null;
      var id = el.id ? (el.id + '-err') : ('field-' + idSuffix + '-err');
      var err = document.getElementById(id);
      if(!err){
        err = document.createElement('div');
        err.id = id;
        err.className = 'field-error';
        err.textContent = msg;
        if(el.parentNode){ el.parentNode.appendChild(err); }
      } else {
        err.textContent = msg;
      }
      return err;
    }

    var errName  = ensureErr(nameEl,  'name',  'Merci dâ€™indiquer vos nom et prÃ©nom.');
    var errPhone = ensureErr(phoneEl, 'phone', 'Merci de renseigner votre numÃ©ro de tÃ©lÃ©phone.');
    var errDep   = ensureErr(depEl,   'start', 'Merci de prÃ©ciser le lieu de dÃ©part.');
    var errDst   = ensureErr(dstEl,   'end',   'Merci de prÃ©ciser la destination.');
    var errDate  = ensureErr(dateEl,  'date',  'Merci de sÃ©lectionner une date valide Ã  partir dâ€™aujourdâ€™hui.');

    function show(el, err){ if(el&&err){ err.style.display='block'; el.classList.add('input-error'); } }
    function hide(el, err){ if(el&&err){ err.style.display='none'; el.classList.remove('input-error'); } }

    function isPastDate(el){
      if(!el || !el.value) return false; // no value: handled by native "required" if present; we focus on "infÃ©rieure Ã  aujourd'hui"
      var v = String(el.value).trim();
      // Expecting YYYY-MM-DD
      var parts = v.split('-');
      if(parts.length !== 3) return true; // invalid format -> treat as invalid
      var y = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, d = parseInt(parts[2],10);
      if(isNaN(y)||isNaN(m)||isNaN(d)) return true;
      var chosen = new Date(y, m, d);
      chosen.setHours(0,0,0,0);
      var today = new Date();
      today.setHours(0,0,0,0);
      return chosen < today;
    }

    function validateRequired(){
      var any=false;
      if(isEmpty(nameEl)){ show(nameEl, errName); any=true; } else { hide(nameEl, errName); }
      if(isEmpty(phoneEl)){ show(phoneEl, errPhone); any=true; } else { hide(phoneEl, errPhone); }
      if(isEmpty(depEl)){ show(depEl, errDep); any=true; } else { hide(depEl, errDep); }
      if(isEmpty(dstEl)){ show(dstEl, errDst); any=true; } else { hide(dstEl, errDst); }

      // Date check: show error if date < today (even if filled)
      if(dateEl){
        if(isPastDate(dateEl)){ show(dateEl, errDate); any=true; } else { hide(dateEl, errDate); }
      }
      return !any;
    }

    // Clear per-field error as user types/changes
    [nameEl, phoneEl, depEl, dstEl].forEach(function(el){
      if(!el) return;
      el.addEventListener('input', function(){
        var err = document.getElementById(el.id ? (el.id + '-err') : '');
        if(err){ err.style.display='none'; }
        el.classList.remove('input-error');
      });
    });
    if(dateEl){
      dateEl.addEventListener('change', function(){
        var id = dateEl.id ? (dateEl.id + '-err') : 'field-date-err';
        var err = document.getElementById(id);
        if(err){ err.style.display='none'; }
        dateEl.classList.remove('input-error');
      });
    }

    // Guard confirm
    confirmBtn.addEventListener('click', function(e){
      if(!validateRequired()){
        e.preventDefault();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        return false;
      }
    }, true);

    // Also guard WA/Mail buttons if present
    document.addEventListener('click', function(e){
      var t = e.target;
      var waBtn = t.closest && (t.closest('#waBtn') || t.closest('[data-action="wa"]'));
      var mailBtn = t.closest && (t.closest('#mailBtn') || t.closest('[data-action="mail"]'));
      if(waBtn || mailBtn){
        if(!validateRequired()){
          e.preventDefault();
          if(e.stopImmediatePropagation) e.stopImmediatePropagation();
          e.stopPropagation();
          return false;
        }
      }
    }, true);
  });
})();
