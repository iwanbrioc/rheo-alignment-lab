// Explicit version selection; the frozen v0.9 implementation stays available unchanged.
process.env.OPENAI_MODEL ||= 'gpt-5.4-mini';
process.env.RHEO_MODEL_PROVIDER ||= 'openai';
if (process.env.RHEO_ENGINE === 'v0.9') await import('../server_v0_9.mjs');
else if (!process.env.RHEO_ENGINE || process.env.RHEO_ENGINE === 'v0.10') {
  const { startExperimentalServer } = await import('../experiments/rheo-v0.10/server.mjs');
  startExperimentalServer();
} else throw new Error('Unknown RHEO_ENGINE. Use v0.9 or v0.10.');
