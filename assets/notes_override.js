
/* TaxiLI – Override buildReserveSummary to include "Notes utiles" */
(function(){
  function v(sel){ var el=document.querySelector(sel); return el? (el.value||'').trim():''; }
  function pick(){ 
    return v('#notes') || v('textarea[name="notes"]') ||
           v('textarea[placeholder*="note" i]') || '';
  }
  // Keep a reference to original if we ever need it
  var orig = window.buildReserveSummary;
  window.buildReserveSummary = function(price){
    try{
      var L = [];
      L.push("Bonjour Taxi Li, je souhaite réserver une course.");
      L.push("");
      L.push("Nouvelle réservation Taxi Li 🚕");
      var name  = v('#name') || v('#nom') || v('input[autocomplete="name"]') || v('input[name="name"]');
      var tel   = v('#phone')|| v('#tel') || v('input[type="tel"]');
      var date  = v('#date') || v('input[type="date"]');
      var time  = v('#time') || v('input[type="time"]');
      var dep   = v('#start')|| v('#depart')|| v('#origin');
      var dst   = v('#end')  || v('#dest')  || v('#destination');
      if(name) L.push("Nom: "+name);
      if(tel)  L.push("Téléphone: "+tel);
      if(date) L.push("Date: "+date);
      if(time) L.push("Heure: "+time);
      if(dep)  L.push("Départ: "+dep);
      if(dst)  L.push("Destination: "+dst);
      // Round trip info: try existing roundTripOn if present
      try { L.push("Aller/retour: " + ( (typeof roundTripOn==='function' && roundTripOn()) ? "Oui" : "Non")); } catch(e){}
      // Waiting info if their helpers exist
      try { if(typeof waitOn==='function' && waitOn()) L.push("Attente: Oui ("+ (typeof waitHours==='function'? waitHours() : '') +" h)"); } catch(e){}
      // Inject Notes utiles
      var notes = pick();
      if(notes) L.push("Notes: " + notes);
      // Price
      if(typeof price==='number' && isFinite(price)) L.push("Estimation: " + price.toFixed(2) + " €");
      else L.push("Estimation: (indisponible)");
      L.push("—");
      L.push("Message envoyé depuis le formulaire en ligne.");
      return L.join("\n");
    } catch(e){
      // fallback to original if something fails
      if(typeof orig === 'function') return orig(price);
      return "Nouvelle réservation Taxi Li";
    }
  };
})();
