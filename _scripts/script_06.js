
(function(){
  function ready(fn){ if(document.readyState!=="loading"){fn();} else {document.addEventListener("DOMContentLoaded", fn);} }

  ready(function(){
    var confirmBtn = document.getElementById('confirmBtn') || document.querySelector('button[data-role="confirm"], .btn-confirm');
    if(!confirmBtn) return;

    // Helpers to find fields with tolerant selectors
    var nameEl  = document.querySelector('#name, input[name="name"], #fullname, #fullName');
    var phoneEl = document.querySelector('#phone, input[name="phone"], #tel, input[type="tel"]');
    var depEl   = document.querySelector('#start, #depart, #origin, input[name="origin"], input[name="start"]');
    var dstEl   = document.querySelector('#end, #destination, #dest, input[name="destination"]');

    function getOrCreateError(el, idSuffix, msg){
      if(!el) return null;
      var id = el.id ? el.id + '-err' : ('field-' + idSuffix + '-err');
      var err = document.getElementById(id);
      if(!err){
        err = document.createElement('div');
        err.id = id;
        err.className = 'field-error';
        err.textContent = msg;
        // insert right after the input
        if(el.parentNode){
          el.parentNode.appendChild(err);
        } else {
          el.insertAdjacentElement('afterend', err);
        }
      }else{
        err.textContent = msg;
      }
      return err;
    }

    // Prepare error elements (created once)
    var errName  = getOrCreateError(nameEl,  'name',  'Merci dâ€™indiquer vos nom et prÃ©nom.');
    var errPhone = getOrCreateError(phoneEl, 'phone', 'Merci de renseigner votre numÃ©ro de tÃ©lÃ©phone.');
    var errDep   = getOrCreateError(depEl,   'start', 'Merci de prÃ©ciser le lieu de dÃ©part.');
    var errDst   = getOrCreateError(dstEl,   'end',   'Merci de prÃ©ciser la destination.');

    function show(el, err){
      if(!el || !err) return;
      err.style.display = 'block';
      el.classList.add('input-error');
    }
    function hide(el, err){
      if(!el || !err) return;
      err.style.display = 'none';
      el.classList.remove('input-error');
    }
    function isEmpty(el){
      return !el || !String(el.value||'').trim();
    }

    // Validate on confirm click
    confirmBtn.addEventListener('click', function(e){
      var anyError = false;
      if(isEmpty(nameEl)){ show(nameEl, errName); anyError = true; } else { hide(nameEl, errName); }
      if(isEmpty(phoneEl)){ show(phoneEl, errPhone); anyError = true; } else { hide(phoneEl, errPhone); }
      if(isEmpty(depEl)){ show(depEl, errDep); anyError = true; } else { hide(depEl, errDep); }
      if(isEmpty(dstEl)){ show(dstEl, errDst); anyError = true; } else { hide(dstEl, errDst); }

      if(anyError){
        e.preventDefault();
        e.stopPropagation();
        // Focus the first invalid field
        try{
          (isEmpty(nameEl)&&nameEl || isEmpty(phoneEl)&&phoneEl || isEmpty(depEl)&&depEl || isEmpty(dstEl)&&dstEl).focus();
        }catch(_){}
        return false;
      }
      // else: proceed normally (no change to your flow)
    });

    // Clear per-field error on input
    [nameEl, phoneEl, depEl, dstEl].forEach(function(el, idx){
      if(!el) return;
      el.addEventListener('input', function(){
        if(el===nameEl) hide(nameEl, errName);
        else if(el===phoneEl) hide(phoneEl, errPhone);
        else if(el===depEl) hide(depEl, errDep);
        else if(el===dstEl) hide(dstEl, errDst);
      });
    });
  });
})();
