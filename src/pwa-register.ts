export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const getCurrentAssetUrls = () => {
    const assetElements = document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>(
      'script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href]',
    );

    return Array.from(assetElements)
      .map(element => element instanceof HTMLScriptElement ? element.src : element.href)
      .filter(Boolean);
  };

  const askWorkerToCacheAssets = (registration: ServiceWorkerRegistration) => {
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    worker?.postMessage({
      type: 'CACHE_URLS',
      urls: getCurrentAssetUrls(),
    });
  };

  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then(registration => {
        askWorkerToCacheAssets(registration);
        return navigator.serviceWorker.ready;
      })
      .then(askWorkerToCacheAssets)
      .catch(error => {
        console.warn('Service worker registration failed:', error);
      });
  });
}
