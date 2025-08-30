
// Patch WhatsApp + FR date formatting + single calendar
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // --- WhatsApp button activate ---
    try {
      var WA_NUMBER = '590691280005'; // Guadeloupe number without + or spaces
      var waLink = 'https://wa.me/' + WA_NUMBER;
      var anchors = Array.from(document.querySelectorAll('a,button'));
      anchors.forEach(function(a){
        var txt = (a.textContent || '').trim().toLowerCase();
        if (txt.includes('whatsapp')) {
          // turn into link
          if (a.tagName.toLowerCase() === 'a') {
            a.href = waLink;
          } else {
            // if it's a button, wrap behavior
            a.addEventListener('click', function(e){
              window.open(waLink, '_blank', 'noopener,noreferrer');
            });
          }
          a.removeAttribute('disabled');
          a.classList.remove('disabled','is-disabled','btn-disabled');
          a.style.pointerEvents = 'auto';
          a.onclick = (function(orig){ 
            return function(ev){
              try { if (orig) orig.call(this, ev); } catch(e){}
              if (!ev.defaultPrevented) window.open(waLink, '_blank', 'noopener,noreferrer');
            };
          })(null);
        }
      });
    } catch(e) { console.warn('WA patch error', e); }

    // --- Date field FR display helper (non-breaking; keeps your existing picker) ---
    try {
      function toFR(d) {
        if (!d) return '';
        // accept "YYYY-MM-DD" or Date
        var dt = (typeof d === 'string') ? new Date(d) : d;
        if (isNaN(dt)) return '';
        const dd = String(dt.getDate()).padStart(2,'0');
        const mm = String(dt.getMonth()+1).padStart(2,'0');
        const yyyy = dt.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
      }
      // find date input
      var dateInput = document.querySelector('input[type="date"]#date, input#date, input[name="date"], input[placeholder*="Date"], input[aria-label*="Date"]');
      if (dateInput) {
        // ensure min today to avoid past selection
        var today = new Date();
        var y = today.getFullYear();
        var m = String(today.getMonth()+1).padStart(2,'0');
        var d = String(today.getDate()).padStart(2,'0');
        if (dateInput.type === 'date') {
          dateInput.min = y + '-' + m + '-' + d;
        }
        // show FR value as title/aria for visual cue
        const updateTitle = function(){
          try {
            var v = dateInput.value;
            if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
              dateInput.setAttribute('title', toFR(v));
              dateInput.setAttribute('data-fr-display', toFR(v));
            }
          } catch(e){}
        };
        dateInput.addEventListener('change', updateTitle);
        dateInput.addEventListener('input', updateTitle);
        updateTitle();
      }
    } catch(e) { console.warn('Date FR helper error', e); }
  });
})();
