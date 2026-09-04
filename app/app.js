// Rheo v0.3 loader. Implementation remains split for auditability.
(function loadSequentially(files){
  const [src, ...rest] = files;
  if (!src) return;
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => loadSequentially(rest);
  script.onerror = () => console.error(`Failed to load ${src}`);
  document.body.appendChild(script);
})(['app-core.js','app-analysis.js','app-report.js','model.js']);
