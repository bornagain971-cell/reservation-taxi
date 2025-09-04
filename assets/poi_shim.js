
/* TaxiLi — POI Shim: prefer POI coords before geocoding */
(function(){
  if (window.__POI_SHIM__) return; window.__POI_SHIM__ = true;

  function preferPOI(geocodeFn){
    return async function(userText){
      try{
        const poi = window.TaxiLiPOI && TaxiLiPOI.resolvePlace(userText);
        if(poi && poi.ok){
          return { lat: poi.lat, lng: poi.lng, label: poi.name, how: poi.source };
        }
      }catch(e){}
      // fallback to original
      const r = await geocodeFn(userText);
      return r;
    };
  }

  // If a global geocoder exists, wrap it
  if (window.geocodeText && typeof window.geocodeText === 'function'){
    window.geocodeText = preferPOI(window.geocodeText);
  }
  if (window.resolveToCoords && typeof window.resolveToCoords === 'function'){
    window.resolveToCoords = preferPOI(window.resolveToCoords);
  }

  // Generic helper to resolve values from inputs by id/name
  window.resolveInputToCoords = async function(selector, fallbackGeocode){
    const el = document.querySelector(selector) || document.querySelector('[name="'+selector.replace(/^#/, '')+'"]');
    const val = el ? el.value : selector;
    const poi = window.TaxiLiPOI && TaxiLiPOI.resolvePlace(val);
    if(poi && poi.ok){ return { lat: poi.lat, lng: poi.lng, label: poi.name, how: poi.source }; }
    if(typeof fallbackGeocode === 'function') return await fallbackGeocode(val);
    if(window.geocodeText) return await window.geocodeText(val);
    return null;
  };

})();
