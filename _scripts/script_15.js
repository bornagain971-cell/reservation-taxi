
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn()} else document.addEventListener('DOMContentLoaded',fn); }
  ready(function(){
    const NORM = s => (s||'').toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();

    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
    const byId = id => document.getElementById(id);

    function findByLabelContains(words){
      // words: ["aller","retour"] matches label text containing both
      const labs = $$('label');
      for(const lb of labs){
        const t = NORM(lb.textContent);
        if(words.every(w => t.includes(NORM(w)))){
          // associated control by for= or nearest input/select
          if(lb.htmlFor){
            const el = byId(lb.htmlFor);
            if(el) return el;
          }
          const el = lb.parentElement && lb.parentElement.querySelector('select,input');
          if(el) return el;
        }
      }
      return null;
    }

    function guessRoundTripControl(){
      return byId('ar') || byId('allerRetour') ||
        document.querySelector('select#ar, select#allerRetour, input[name="roundTrip"], input[name="allerRetour"]') ||
        findByLabelContains(['aller','retour']) ||
        // fallback: a group containing the phrase
        $$('*').find(el => NORM(el.textContent).includes('aller/retour'));
    }

    function guessAttenteYN(){
      return byId('attente') || byId('attente_trajet') ||
        document.querySelector('select#attente, input[name="attente"]') ||
        findByLabelContains(['attente','trajet']) ||
        $$('*').find(el => NORM(el.textContent).includes('attente pendant le trajet'));
    }

    function guessDureeSelect(){
      return byId('attenteHeures') || byId('dureeAttente') ||
        document.querySelector('select#attenteHeures, select#dureeAttente') ||
        findByLabelContains(['duree','attente']) ||
        // any select near a label containing both words
        (function(){
          const labs = $$('label');
          for(const lb of labs){
            const t = NORM(lb.textContent);
            if(t.includes('duree') && t.includes('attente')){
              const s = lb.parentElement && lb.parentElement.querySelector('select');
              if(s) return s;
            }
          }
          // last resort: the only select with numeric options incl. 0
          const selects = $$('select');
          for(const s of selects){
            const vals = $$('#option', s).map(o=>o.value);
          }
          return $$('select').find(s => s.options && s.options.length <= 5);
        })();
    }

    function isYes(el){
      if(!el) return false;
      // Select
      if(el.tagName && el.tagName.toLowerCase()==='select'){
        return /oui|yes/gi.test((el.value||''));
      }
      // Checkbox
      if(el.type==='checkbox') return !!el.checked;
      // Radio
      if(el.type==='radio'){
        const yes = el.form && el.form.querySelector('input[name="'+el.name+'"][value="oui"], input[name="'+el.name+'"][value="yes"]');
        return yes ? !!yes.checked : false;
      }
      // Button-group with aria-pressed or .active
      const grp = el.closest('.btn-group,[role="group"]') || el;
      if(grp){
        const active = grp.querySelector('[aria-pressed="true"], .active');
        if(active) return /oui|yes/i.test(active.textContent||'');
      }
      // Text content fallback
      const txt = NORM(el.textContent);
      if(txt.includes('oui') && (el.getAttribute('aria-pressed')==='true' || el.classList.contains('active'))) return true;
      return false;
    }

    const arCtrl = guessRoundTripControl();
    const attCtrl = guessAttenteYN();
    const dureeSel = guessDureeSelect();

    if(!dureeSel) return; // nothing to do

    function rebuildOptions(enabled){
      // wipe
      while(dureeSel.firstChild) dureeSel.removeChild(dureeSel.firstChild);
      if(enabled){
        for(let i=1;i<=4;i++){
          const o=document.createElement('option'); o.value=String(i); o.textContent=String(i);
          dureeSel.appendChild(o);
        }
        dureeSel.removeAttribute('disabled');
        if(!dureeSel.value || dureeSel.value==="0"){ dureeSel.value="1"; }
      }else{
        const o0=document.createElement('option'); o0.value="0"; o0.textContent="0";
        dureeSel.appendChild(o0);
        dureeSel.value="0";
        dureeSel.setAttribute('disabled','disabled');
      }
    }

    function applyState(){
      const enable = isYes(arCtrl) && isYes(attCtrl);
      rebuildOptions(enable);
    }

    applyState();

    // Bind changes robustly
    [arCtrl, attCtrl].forEach(el=>{
      if(!el) return;
      el.addEventListener('change', ()=> setTimeout(applyState, 30));
      const grp = el.closest('.btn-group,[role="group"]') || document;
      grp.addEventListener('click', ()=> setTimeout(applyState, 30), true);
      grp.addEventListener('keydown', ()=> setTimeout(applyState, 30), true);
    });

    // MutationObserver pour capter un changement de .active / aria-pressed
    const obsTargets = [];
    if(arCtrl){ obsTargets.push(arCtrl.closest('.btn-group,[role="group"]') || arCtrl); }
    if(attCtrl){ obsTargets.push(attCtrl.closest('.btn-group,[role="group"]') || attCtrl); }
    const mo = new MutationObserver(()=> setTimeout(applyState, 10));
    obsTargets.forEach(t => t && mo.observe(t, {attributes:true, subtree:true, attributeFilter:['class','aria-pressed','value']}));

    // Fallback: re-appliquer toutes les 500ms pendant 2s (au cas oÃ¹ composants async)
    let n=0; const it = setInterval(()=>{ applyState(); if(++n>4) clearInterval(it); }, 500);
  });
})();
