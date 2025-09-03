
/* TaxiLI — Wrapper for encodeURIComponent to inject Notes (WA & Mail) and Estimation for email if available */
(function(){
  if (window.__ENC_WRAP__) return; window.__ENC_WRAP__ = true;
  var _enc = window.encodeURIComponent;
  function $(sel){ return document.querySelector(sel); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }

  function insertNotes(text){
    try{
      if (/Notes:/i.test(text)) return text;
      var notes = tv($('#notes')) || tv(document.querySelector('textarea[name="notes"]')) ||
                  tv(document.querySelector('textarea[placeholder*="note" i]'));
      if(!notes) return text;
      if (/Estimation:/i.test(text)){
        return text.replace(/(Estimation:[^\n]*\n?)/i, 'Notes: '+notes+'\n$1');
      }
      if (/\n—/.test(text)){
        return text.replace(/\n—/, '\nNotes: '+notes+'\n—');
      }
      return text + '\nNotes: '+notes;
    }catch(e){ return text; }
  }

  function insertEstimateIfMissing(text){
    try{
      if (/Estimation:/i.test(text)) return text;
      var out = $('#estimateOut') || document.querySelector('.estimateValue,.result,.estimation');
      var price = NaN;
      if(out){
        if(out.dataset && out.dataset.value){
          price = parseFloat(String(out.dataset.value).replace(',','.'));
        }
        if(!isFinite(price)){
          var m = (tv(out).match(/(\d+[.,]\d+)/)||[])[1];
          if(m) price = parseFloat(String(m).replace(',','.'));
        }
      }
      if(isFinite(price)){
        var human = price.toFixed(2).replace('.',',')+' €';
        if (/\n—/.test(text)){
          return text.replace(/\n—/, '\nEstimation: '+human+'\n—');
        }
        return text + '\nEstimation: '+human;
      }
      return text;
    }catch(e){ return text; }
  }

  window.encodeURIComponent = function(s){
    try{
      if (typeof s === 'string' && /Nouvelle réservation Taxi Li|Nouvelle rÃ©servation Taxi Li/.test(s)){
        var t = s;
        t = insertNotes(t);
        if (!/Estimation:/i.test(t)){
          t = insertEstimateIfMissing(t);
        }
        return _enc.call(this, t);
      }
    }catch(e){}
    return _enc.apply(this, arguments);
  };
})();
