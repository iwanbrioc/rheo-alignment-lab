// Compatibility bridge between the v0.5 primary interview and the retained v0.4 research wizard.
(() => {
  const advanced=document.getElementById('advancedFormBtn');
  if(advanced){
    advanced.onclick=()=>{
      let legacy=document.getElementById('openingContext');
      if(!legacy){
        legacy=document.createElement('textarea');
        legacy.id='openingContext';legacy.className='hidden';legacy.setAttribute('aria-hidden','true');
        document.body.appendChild(legacy);
      }
      legacy.value=document.getElementById('interviewOpening')?.value.trim()||'';
      if(typeof start==='function')start();
    };
  }

  const saved=document.getElementById('savedBtn');
  if(saved&&saved.onclick){
    const previous=saved.onclick;
    saved.onclick=()=>{
      document.getElementById('interviewView')?.classList.add('hidden');
      previous();
    };
  }
})();
