
/* TaxiLI — WA PLAIN FORWARD
   But: Au clic sur "Réserver par WhatsApp", ne calcule rien.
   Recopie TOUTES les données du formulaire (y compris le prix déjà affiché) et les envoie dans le message.
*/
(function(){
  if (window.__WA_PLAIN_FORWARD__) return; window.__WA_PLAIN_FORWARD__ = true;

  function $(s){ return document.querySelector(s); }
  function tv(el){ return (el && (el.value||el.textContent)||'').trim(); }
  function labelize(id, name, placeholder){
    if(id){
      // French friendly aliases
      var map = {
        name:"Nom", nom:"Nom", phone:"Téléphone", tel:"Téléphone",
        start:"Départ", depart:"Départ", origin:"Départ",
        end:"Destination", dest:"Destination", destination:"Destination",
        date:"Date", time:"Heure",
        passengers:"Passagers", baggages:"Bagages",
        roundtrip:"Aller/retour", allerRetour:"Aller/retour", ar:"Aller/retour",
        waitOnTrip:"Attente pendant le trajet", attente:"Attente pendant le trajet",
        waitDuring:"Attente pendant le trajet", attente_trajet:"Attente pendant le trajet",
        waitHours:"Durée d'attente (heures)", attenteHeures:"Durée d'attente (heures)", dureeAttente:"Durée d'attente (heures)",
        childSeat:"Siège enfant", siege:"Siège enfant", siegeEnfant:"Siège enfant",
        notes:"Notes utiles"
      };
      if(map[id]) return map[id];
    }
    if(name){
      var mapn = {
        name:"Nom", phone:"Téléphone", tel:"Téléphone",
        start:"Départ", origin:"Départ", end:"Destination", dest:"Destination", destination:"Destination",
        date:"Date", time:"Heure", passengers:"Passagers", baggages:"Bagages",
        roundtrip:"Aller/retour", attente:"Attente pendant le trajet", attenteHeures:"Durée d'attente (heures)",
        dureeAttente:"Durée d'attente (heures)", childSeat:"Siège enfant", siegeEnfant:"Siège enfant", notes:"Notes utiles"
      };
      if(mapn[name]) return mapn[name];
    }
    if(placeholder){ return placeholder.replace(/\s*\*?$/,''); }
    return (id||name||"Champ");
  }

  function readFormFields(){
    var fields = [];
    var scope = document; // whole page
    // Known, ordered set first (for joli rendu)
    var ordered = [
      ['#name','#nom','input[autocomplete="name"]','input[name="name"]'],
      ['#phone','#tel','input[type="tel"]'],
      ['#start','#depart','#origin'],
      ['#end','#dest','#destination'],
      ['#date','input[type="date"]'],
      ['#time','input[type="time"]'],
      ['#passengers','select[name="passengers"]'],
      ['#baggages','select[name="baggages"]'],
      ['#roundtrip','#allerRetour','#ar','[name="roundtrip"]'],
      ['#attente','#waitOnTrip','#waitDuring','#attente_trajet','[name="attente"]'],
      ['#waitHours','#attenteHeures','#dureeAttente','[name="attenteHeures"]','[name="dureeAttente"]'],
      ['#childSeat','#siege','#siegeEnfant','[name="childSeat"]','[name="siegeEnfant"]'],
      ['#notes','textarea[name="notes"]','textarea[placeholder*="note" i]']
    ];
    var seen = new Set();
    function pushEl(el){
      if(!el) return;
      if(seen.has(el)) return;
      seen.add(el);
      var id = el.id||'';
      var name = el.name||'';
      var ph = el.placeholder||'';
      var label = labelize(id,name,ph);
      var val = (el.tagName==='SELECT') ? tv(el) : tv(el);
      // Normalize some values for yes/no
      if(/(roundtrip|allerRetour|ar|attente|childSeat|siegeEnfant)/i.test(id+name)){
        var low = val.toLowerCase();
        if(/^(true|1|on|oui|yes)$/i.test(val)) val = 'Oui';
        else if(/^(false|0|off|non|no)$/i.test(val)||low==='') val = 'Non';
      }
      fields.push({label, value: val});
    }
    ordered.forEach(group=>{
      for(var i=0;i<group.length;i++){
        var el = scope.querySelector(group[i]);
        if(el){ pushEl(el); break; }
      }
    });
    // Add any other inputs/selects/textareas not already added (fallback)
    Array.from(scope.querySelectorAll('input, select, textarea')).forEach(function(el){
      if(seen.has(el)) return;
      // Skip buttons/hidden without name/value
      if(el.type && /button|submit|image/i.test(el.type)) return;
      var id = el.id||''; var name = el.name||''; var ph = el.placeholder||'';
      var label = labelize(id,name,ph);
      var val = (el.tagName==='SELECT') ? tv(el) : tv(el);
      fields.push({label, value: val});
    });
    // Estimation affichée
    var est = scope.querySelector('#estimateOut, .estimateValue, .result, .estimation');
    if(est){
      fields.push({label:'Estimation', value: tv(est)});
    }
    return fields;
  }

  function buildMessage(){
    var L = [];
    L.push("Bonjour Taxi Li, je souhaite réserver une course.");
    L.push("Nouvelle réservation Taxi Li 🚕");
    var fields = readFormFields();
    fields.forEach(function(f){
      if(f.label && (f.value!==undefined)){
        L.push(f.label + ": " + (String(f.value).trim() || "(vide)"));
      }
    });
    L.push("—");
    L.push("Message envoyé depuis le formulaire en ligne.");
    return L.join("\n");
  }

  function isWATrigger(el){
    if(!el) return false;
    var node = el.closest && el.closest('a,button');
    if(!node) return false;
    var label = (node.innerText||node.textContent||'').toLowerCase();
    if(label.includes('réserver par whatsapp') || label.includes('reserver par whatsapp')) return true;
    var href = (node.getAttribute && node.getAttribute('href')) || '';
    if(/wa\.me|whatsapp/i.test(href)) return true;
    if(node.hasAttribute && (node.hasAttribute('data-plain-wa') || node.hasAttribute('data-wa'))) return true;
    return false;
  }

  function onClick(e){
    var trg = e.target;
    if(!trg || !isWATrigger(trg)) return;
    e.preventDefault();
    e.stopPropagation();
    try{ e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(err){}

    var msg = buildMessage();

    // Use existing wa link number if present; else fallback
    var base = 'https://wa.me/590691280005';
    var waA = document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
    if(waA){
      var href = waA.getAttribute('href')||'';
      var m = href.match(/wa\.me\/(\d+)/);
      if(m) base = 'https://wa.me/' + m[1];
    }
    var url = base + '?text=' + encodeURIComponent(msg);
    window.location.href = url;
  }

  ['click','pointerdown','touchstart'].forEach(function(evt){
    document.addEventListener(evt, onClick, true); // capture pour passer avant d'autres handlers
    window.addEventListener(evt, onClick, true);
  });
})();
