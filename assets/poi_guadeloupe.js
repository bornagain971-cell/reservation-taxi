
/* TaxiLi — POI Guadeloupe (CHU, Aéroport, etc.) */
(function(){
  if (window.TaxiLiPOI) return;
  const norm = s => (s||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\s\-]/g,"")
    .replace(/\s+/g," ").trim();

  const POIS = [
    { name: "CHU de Pointe-à-Pitre", lat: 16.2409, lng: -61.5332,
      aliases: ["chu", "chu pap", "chu pointe a pitre", "chu pointe-à-pitre", "hopital pap", "hôpital pap"] },
    { name: "Aéroport Pôle Caraïbes", lat: 16.2660, lng: -61.5318,
      aliases: ["aeroport", "aéroport", "pole caraibes", "pôle caraïbes", "ptp airport", "ptp"] },
    { name: "Gare Maritime Bergevin", lat: 16.2388, lng: -61.5416,
      aliases: ["gare maritime", "bergevin", "ferry pap", "port pap"] },
    { name: "Capesterre-Belle-Eau (Centre)", lat: 16.0417, lng: -61.5634,
      aliases: ["capesterre", "capesterre belle eau", "capesterre-belle-eau", "capesterre centre"] },
    { name: "Basse-Terre (Palais de Justice)", lat: 15.9973, lng: -61.7260,
      aliases: ["basse terre", "basse-terre", "bt centre", "prefecture basse terre"] },
    { name: "Sainte-Anne (Centre)", lat: 16.2264, lng: -61.3891,
      aliases: ["ste-anne", "sainte-anne", "sainte anne", "ste anne centre"] },
  ];

  const byToken = new Map();
  POIS.forEach(p => {
    [p.name, ...(p.aliases||[])].forEach(label => {
      byToken.set(norm(label), p);
    });
  });

  function resolvePlace(input) {
    const key = norm(input);
    const hit = byToken.get(key);
    if (hit) return { ok:true, name: hit.name, lat: hit.lat, lng: hit.lng, source:"poi" };

    // soft inclusion
    for (const [token, poi] of byToken.entries()) {
      if (token.length >= 3 && key.includes(token)) {
        return { ok:true, name: poi.name, lat: poi.lat, lng: poi.lng, source:"poi~" };
      }
    }
    return { ok:false };
  }

  window.TaxiLiPOI = { resolvePlace, POIS, norm };
})();
