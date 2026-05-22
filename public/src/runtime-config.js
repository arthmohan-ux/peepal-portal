(function () {
  async function loadRuntimeConfig() {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.config) window.PORTAL_CONFIG = data.config;
    } catch (error) {
      console.warn('Using bundled portal config:', error.message);
    }

    if (typeof window.__applyCandidateConfig === 'function') window.__applyCandidateConfig();
    if (typeof window.__applyAppConfig === 'function') window.__applyAppConfig();
    if (typeof window.__applyAnalyticsConfig === 'function') window.__applyAnalyticsConfig();
    return window.PORTAL_CONFIG;
  }

  window.portalConfigReady = loadRuntimeConfig();
})();
