// Small shell-level labels for the v0.6 longitudinal prototype.
(() => {
  const hero=document.getElementById('homeView');
  const eyebrow=hero?.querySelector('.eyebrow');
  if(eyebrow)eyebrow.textContent='Rheo v0.6 · testimony → action → consequence';
  const lead=hero?.querySelector('.lead');
  if(lead)lead.textContent='Start wherever makes sense. Rheo will listen, ask one question at a time, let a working flow pattern emerge, then offer three different things you could try. If you act, you can come back and tell Rheo what actually happened.';
  const footer=document.querySelector('footer');
  if(footer)footer.textContent='Rheo v0.6 longitudinal research prototype · no aggregate RWB reward';
})();
