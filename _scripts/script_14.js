
document.addEventListener('DOMContentLoaded', function(){
  function scrollToFirstError(){
    // 1) Prefer a visible .field-error
    var err = Array.from(document.querySelectorAll('.field-error')).find(function(n){
      return n && n.style && n.style.display !== 'none' && n.offsetParent !== null;
    });
    if(err && err.scrollIntoView){ err.scrollIntoView({behavior:'smooth', block:'center'}); return true; }
    // 2) Fallback to first input with .input-error
    var bad = document.querySelector('.input-error');
    if(bad && bad.scrollIntoView){ bad.scrollIntoView({behavior:'smooth', block:'center'}); return true; }
    return false;
  }

  function hookClick(sel){
    var el = document.querySelector(sel);
    if(!el) return;
    el.addEventListener('click', function(){
      // Wait a tick so validators can show messages, then scroll
      setTimeout(scrollToFirstError, 50);
    }, true);
  }

  // Hook main actions
  hookClick('#confirmBtn');
  hookClick('button[data-role="confirm"]');
  hookClick('.btn-confirm');
  // Also hook possible WhatsApp / Mail
  document.addEventListener('click', function(e){
    var t = e.target;
    var waBtn = t.closest && (t.closest('#waBtn') || t.closest('[data-action="wa"]'));
    var mailBtn = t.closest && (t.closest('#mailBtn') || t.closest('[data-action="mail"]'));
    if(waBtn || mailBtn){
      setTimeout(scrollToFirstError, 50);
    }
  }, true);
});
