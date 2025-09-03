
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn()} else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));

    // Reuse detection from previous script if present
    function isReserveAction(el){
      if(!el) return false;
      const txt = (el.textContent||'').toLowerCase();
      const href = (el.getAttribute && el.getAttribute('href')) || '';
      return /rÃ©server par whatsapp|rÃ©server par e-?mail/.test(txt) || (href.includes('wa.me') || href.startsWith('mailto:'));
    }

    // Force-stabilize the email anchor: ensure it's an <a href="mailto:..."> even if the DOM puts a <button>
    const actions = $$('a,button');
    let mailBtn = actions.find(el => /rÃ©server par e-?mail/i.test((el.textContent||'')));
    if(!mailBtn){
      mailBtn = actions.find(el => {
        const href=(el.getAttribute && el.getAttribute('href'))||'';
        return href && href.startsWith('mailto:');
      });
    }

    if(mailBtn){
      // If it's a button, convert its click into opening a mailto URL we build
      mailBtn.addEventListener('click', function(e){
        // If some earlier script already prevented default because of validation errors, we let that win.
        // We'll only act if the event is not canceled.
        if(e.defaultPrevented) return;

        // Build a minimal subject/body if upstream script hasn't already redirected
        const nameInput  = document.getElementById('name') || document.getElementById('nom') || document.querySelector('input[autocomplete="name"]') || document.querySelector('input[name="name"]');
        const startInput = document.getElementById('start') || document.getElementById('depart') || document.getElementById('origin');
        const endInput   = document.getElementById('end')   || document.getElementById('dest')   || document.getElementById('destination');
        const dateInput  = document.getElementById('date')  || document.querySelector('input[type="date"]');
        const timeInput  = document.getElementById('time')  || document.querySelector('input[type="time"]');

        const subject = 'RÃ©servation Taxi Li â€“ ' + (nameInput? (nameInput.value||'Client'): 'Client');
        const lines = [];
        lines.push("Nouvelle rÃ©servation Taxi Li ðŸš•");
        if(nameInput) lines.push("Nom: " + (nameInput.value||''));
        if(dateInput) lines.push("Date: " + (dateInput.value||''));
        if(timeInput) lines.push("Heure: " + (timeInput.value||''));
        if(startInput)lines.push("DÃ©part: " + (startInput.value||''));
        if(endInput)  lines.push("Destination: " + (endInput.value||''));
        lines.push("â€”");
        lines.push("Message envoyÃ© depuis le formulaire en ligne.");
        const body = lines.join("\n");

        // Destination email (fallback to taxili@laposte.net)
        let href = (mailBtn.getAttribute('href')||'').trim();
        if(!href || !href.startsWith('mailto:')){
          href = 'mailto:taxili@laposte.net';
        }
        // Strip old params
        href = href.replace(/\?(.*)$/,'');
        const url = href + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

        // Use window.location to trigger default mail client
        // But only if upstream logic didn't already craft a URL
        e.preventDefault();
        e.stopPropagation();
        window.location.href = url;
      }, true);
    }

    // As a final fallback, capture the document-level click on any mailto link to ensure body/subject presence.
    document.addEventListener('click', function(ev){
      const a = ev.target.closest('a[href^="mailto:"]');
      if(!a) return;
      // If already has subject & body, we keep it; else add minimal placeholders
      const href = a.getAttribute('href');
      if(/\bsubject=/.test(href) && /\bbody=/.test(href)) return;
      ev.preventDefault();
      const url = href + (href.includes('?')?'&':'?') + 'subject=' + encodeURIComponent('RÃ©servation Taxi Li') + '&body=' + encodeURIComponent('Nouvelle rÃ©servation Taxi Li');
      window.location.href = url;
    }, true);
  });
})();
