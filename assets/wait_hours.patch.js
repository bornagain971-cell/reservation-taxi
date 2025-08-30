
/**
 * ENFORCER PATCH
 * Règle stricte :
 *   - Si Aller/retour = Oui  -> "Durée d’attente (heures)" = 0, verrouillé (désactivé).
 *   - Sinon, si Attente pendant le trajet = Oui -> options 1..4, actif (défaut 1).
 *   - Sinon -> 0, verrouillé.
 * Le patch s'exécute après les autres scripts et ré-applique la règle même si un ancien code tente de la modifier.
 */
(function(){
  function norm(v){
    v = (v||'').toString().trim().toLowerCase();
    if(v==='oui' || v==='yes') return 'oui';
    if(v==='non' || v==='no') return 'non';
    return v;
  }
  function setOpts(sel, arr){
    if(!sel) return;
    let needRebuild = sel.options.length !== arr.length ||
                      arr.some((v,i)=> String(sel.options[i]?.value) !== String(v));
    if(needRebuild){
      while(sel.firstChild) sel.removeChild(sel.firstChild);
      arr.forEach(v => {
        const opt = document.createElement('option');
        opt.value = String(v);
        opt.textContent = String(v);
        sel.appendChild(opt);
      });
    }
  }
  function enforce(){
    var rtSel = document.getElementById('roundtrip') || document.getElementById('roundTrip');
    var wtSel = document.getElementById('waitOnTrip') || document.getElementById('waitDuring');
    var hours = document.getElementById('waitHours');
    if(!hours) return;

    var rt = norm(rtSel && rtSel.value);
    var wt = norm(wtSel && wtSel.value);

    if(rt === 'oui'){
      setOpts(hours,[0]);
      if(hours.value !== '0') hours.value = '0';
      if(!hours.disabled) hours.disabled = true;
      return;
    }

    if(wt === 'oui'){
      setOpts(hours,[1,2,3,4]);
      if(hours.disabled) hours.disabled = false;
      var cur = parseInt(hours.value||'0',10);
      if(!(cur>=1 && cur<=4)) hours.value = '1';
    }else{
      setOpts(hours,[0]);
      if(hours.value !== '0') hours.value = '0';
      if(!hours.disabled) hours.disabled = true;
    }
  }
  function bind(){
    var rtSel = document.getElementById('roundtrip') || document.getElementById('roundTrip');
    var wtSel = document.getElementById('waitOnTrip') || document.getElementById('waitDuring');
    ['change','input'].forEach(ev=>{
      if(rtSel) rtSel.addEventListener(ev, ()=> setTimeout(enforce,0), true);
      if(wtSel) wtSel.addEventListener(ev, ()=> setTimeout(enforce,0), true);
    });
    // First run
    enforce();
    // Safety guard for late scripts trying to override
    let ticks = 0;
    const guard = setInterval(()=>{
      enforce();
      if(++ticks > 20) clearInterval(guard); // ~3s
    }, 150);
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', bind); }
  else { bind(); }
})();
