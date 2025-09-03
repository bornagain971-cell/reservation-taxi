
(function(){
  document.addEventListener('click', function(ev){
    const el = ev.target.closest('a,button');
    if(!el) return;
    const txt = (el.textContent||'').toLowerCase();
    if(!(txt.includes('rÃ©server par whatsapp') || txt.includes('reserver par whatsapp'))) return;
    setTimeout(function(){
      try{
        if(location.href.startsWith('https://wa.me/')){
          const url = new URL(location.href);
          const params = new URLSearchParams(url.search);
          const old = params.get('text') || '';
          const greeting = 'Bonjour Taxi Li, je souhaite rÃ©server une course.';
          const merged = greeting + '\n\n' + old;
          params.set('text', merged);
          url.search = params.toString();
          location.replace(url.toString());
        }
      }catch(e){}
    }, 0);
  }, true);
})();
