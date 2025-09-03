
document.addEventListener('DOMContentLoaded', function(){
  var phoneEl = document.querySelector('#phone, input[name="phone"], #tel, input[type="tel"]');
  var dateEl  = document.querySelector('#date, input[name="date"], input[type="date"]');
  var timeEl  = document.querySelector('#time, input[name="time"], input[type="time"]');
  var confirmBtn = document.getElementById('confirmBtn') || document.querySelector('button[data-role="confirm"], .btn-confirm');

  function ensureErr(el, idSuffix, msg){
    if(!el) return null;
    var id = el.id ? el.id + '-err' : 'field-' + idSuffix + '-err';
    var box = document.getElementById(id);
    if(!box){
      box = document.createElement('div');
      box.id = id;
      box.className = 'field-error';
      box.style.display = 'none';
      box.textContent = msg;
      if(el.parentNode){ el.parentNode.appendChild(box); }
    } else {
      box.textContent = msg;
    }
    return box;
  }

  var phoneErr = ensureErr(phoneEl, 'phone', 'Merci de renseigner un numÃ©ro de tÃ©lÃ©phone valide (chiffres uniquement).');
  var timeErr  = ensureErr(timeEl,  'time',  'Merci de choisir une heure Ã  partir de maintenant.');

  function show(el, box){ if(el&&box){ box.style.display='block'; el.classList.add('input-error'); } }
  function hide(el, box){ if(el&&box){ box.style.display='none'; el.classList.remove('input-error'); } }

  function invalidPhone(){
    if(!phoneEl) return false;
    var v=(phoneEl.value||'').trim();
    if(!v) return false;
    return /[A-Za-z]/.test(v);
  }

  function parseDate(val){
    if(!val) return null;
    var p = String(val).split('-'); if(p.length!==3) return null;
    var y=+p[0], m=+p[1]-1, d=+p[2]; if(isNaN(y)||isNaN(m)||isNaN(d)) return null;
    return new Date(y,m,d);
  }
  function parseTime(val){
    if(!val) return null;
    var p = String(val).split(':');
    var h=+p[0], mi=+p[1]||0; if(isNaN(h)||isNaN(mi)) return null;
    return {h:h, m:mi};
  }
  function isToday(d){
    var now=new Date();
    return d && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
  }
  function invalidTime(){
    if(!timeEl) return false;
    var t=parseTime(timeEl.value); if(!t) return false;
    var d=parseDate(dateEl && dateEl.value);
    if(d && isToday(d)){
      var now=new Date();
      var input=new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m, 0, 0);
      return input < now;
    }
    return false;
  }

  function showErrors(){
    if(invalidPhone()){ show(phoneEl, phoneErr); } else { hide(phoneEl, phoneErr); }
    if(invalidTime()){ show(timeEl, timeErr); } else { hide(timeEl, timeErr); }
  }

  // Hook events
  if(confirmBtn){ confirmBtn.addEventListener('click', showErrors); }
  if(phoneEl){ phoneEl.addEventListener('input', function(){ if(!invalidPhone()) hide(phoneEl, phoneErr); }); }
  if(timeEl){ timeEl.addEventListener('change', function(){ if(!invalidTime()) hide(timeEl, timeErr); }); }
  if(dateEl){ dateEl.addEventListener('change', function(){ if(!invalidTime()) hide(timeEl, timeErr); }); }
});
