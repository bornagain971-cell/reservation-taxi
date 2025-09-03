
(function(){
  function ready(fn){ if(document.readyState!=='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  ready(function(){
    var phoneEl = document.querySelector('#phone, input[name="phone"], #tel, input[type="tel"]');
    var dateEl  = document.querySelector('#date, input[name="date"], input[type="date"]');
    var timeEl  = document.querySelector('#time, input[name="time"], input[type="time"]');
    var confirmBtn = document.getElementById('confirmBtn') || document.querySelector('button[data-role="confirm"], .btn-confirm');

    function getErr(el, idSuffix){
      if(!el) return null;
      var id = el.id ? el.id + '-err' : 'field-' + idSuffix + '-err';
      return document.getElementById(id);
    }
    function hasLettersPhone(){
      if(!phoneEl) return false;
      var v=(phoneEl.value||'').trim();
      if(!v) return false;
      return /[A-Za-z]/.test(v);
    }
    function parseDate(val){
      if(!val) return null;
      var p=String(val).split('-'); if(p.length!==3) return null;
      var y=+p[0], m=+p[1]-1, d=+p[2]; if(isNaN(y)||isNaN(m)||isNaN(d)) return null;
      return new Date(y,m,d);
    }
    function parseTime(val){
      if(!val) return null;
      var p=String(val).split(':');
      var h=+p[0], mi=+p[1]||0; if(isNaN(h)||isNaN(mi)) return null;
      return {h:h, m:mi};
    }
    function isToday(d){
      var now=new Date();
      return d && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
    }
    function timeInPast(){
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

    function hasBlockingErrors(){
      var phoneErr = getErr(phoneEl,'phone');
      var timeErr  = getErr(timeEl,'time');
      var blocked=false;
      if(hasLettersPhone()){ if(phoneErr){ phoneErr.style.display='block'; } phoneEl && phoneEl.classList.add('input-error'); blocked=true; }
      if(timeInPast()){ if(timeErr){ timeErr.style.display='block'; } timeEl && timeEl.classList.add('input-error'); blocked=true; }
      return blocked;
    }

    function blockIfErrors(e){
      if(hasBlockingErrors()){
        e.preventDefault();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();
        e.stopPropagation();
        return false;
      }
    }

    if(confirmBtn){ confirmBtn.addEventListener('click', blockIfErrors, true); }

    document.addEventListener('click', function(e){
      var t = e.target;
      var waBtn = t.closest && (t.closest('#waBtn') || t.closest('[data-action="wa"]'));
      var mailBtn = t.closest && (t.closest('#mailBtn') || t.closest('[data-action="mail"]'));
      if(waBtn || mailBtn){ blockIfErrors(e); }
    }, true);
  });
})();
