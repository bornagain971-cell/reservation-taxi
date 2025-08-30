
// ===== Simple arrows+dots slider (no width/transform), cache-safe =====
const onReady = (fn)=>document.addEventListener('DOMContentLoaded', fn);

function initSliderV39(){
  const root = document.querySelector('.gallery.slider'); if(!root) return;
  const images = [...root.querySelectorAll('.slides img')]; if(!images.length) return;
  const prev = root.querySelector('.nav.prev'); const next = root.querySelector('.nav.next');
  const dotsWrap = root.querySelector('.slider-dots');
  let i = 0;
  // Build dots
  dotsWrap.innerHTML='';
  const dots = images.map((_,idx)=>{
    const b=document.createElement('button');
    b.addEventListener('click',()=>{i=idx; update();});
    dotsWrap.appendChild(b);
    return b;
  });
  function update(){
    images.forEach((img,idx)=>img.classList.toggle('active', idx===i));
    dots.forEach((d,idx)=>d.classList.toggle('active', idx===i));
  }
  function go(d){ i=(i+d+images.length)%images.length; update(); }
  prev?.addEventListener('click', ()=>go(-1));
  next?.addEventListener('click', ()=>go(1));
  root.addEventListener('keydown', (e)=>{ if(e.key==='ArrowLeft') go(-1); if(e.key==='ArrowRight') go(1); });
  root.setAttribute('tabindex','0');
  update();
}

onReady(()=>{ initSliderV39(); });
