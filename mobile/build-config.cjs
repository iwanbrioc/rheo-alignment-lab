function httpsOrigin(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a deployed HTTPS address.`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || value !== url.origin
    || url.pathname !== '/' || url.port || !url.hostname.includes('.')
    || /(^localhost$|\.localhost$|\.local$|\.invalid$|\.example$|^example\.|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^\[)/i.test(url.hostname)) {
    throw new Error(`${name} must be a deployed HTTPS origin, not a local address or placeholder.`);
  }
  return url.origin;
}

function validateBuildEnvironment(env) {
  const privateBeta = env.EXPO_PUBLIC_RHEO_PRIVATE_BETA === 'true';
  const distributed = ['preview', 'preview-simulator'].includes(env.EAS_BUILD_PROFILE);
  if (distributed && !privateBeta) throw new Error('Private preview builds require invitation access.');
  for (const key of Object.keys(env)) {
    if (key.startsWith('EXPO_PUBLIC_') && /(SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_CODE)/i.test(key) && env[key]) {
      throw new Error(`Do not bundle secrets in ${key}.`);
    }
  }
  if (privateBeta) {
    const core = httpsOrigin(env.EXPO_PUBLIC_RHEO_API_URL, 'EXPO_PUBLIC_RHEO_API_URL');
    const helper = httpsOrigin(env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL, 'EXPO_PUBLIC_LOCAL_CONTEXT_API_URL');
    if (core !== helper) throw new Error('Private-test services must use the same authenticated HTTPS origin.');
    if (env.EXPO_PUBLIC_RHEO_ENGINE !== 'v0.10') throw new Error('Private testing requires the v0.10 product endpoint.');
  }
  return { privateBeta };
}
module.exports = { validateBuildEnvironment, httpsOrigin };
