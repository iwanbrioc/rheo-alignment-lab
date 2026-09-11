// Product-only defaults. The existing decision engine, prompts and schemas stay unchanged.
process.env.OPENAI_MODEL ||= 'gpt-5.4-mini';
process.env.RHEO_MODEL_PROVIDER ||= 'openai';
await import('../server_v0_9.mjs');
