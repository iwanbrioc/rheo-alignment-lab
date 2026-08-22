// Rheo v0.5 loader. Implementation remains split for auditability.
(function loadSequentially(files){
  const [src, ...rest] = files;
  if (!src) return;
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => loadSequentially(rest);
  script.onerror = () => console.error(`Failed to load ${src}`);
  document.body.appendChild(script);
})(['app-core.js','flow-ui.js','app-analysis.js','app-report.js','model.js','interview-ui.js','interview-compat.js','voice.js']);
