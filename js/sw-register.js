// Registra o service worker (sw.js, na raiz do site). Só no site publicado (HTTPS):
// no Live Server/localhost não registra, para o cache não segurar versões velhas enquanto você testa (use ?sw=1 para forçar).
(function () {
  const SRC = document.currentScript ? document.currentScript.src : location.href;
  if (!('serviceWorker' in navigator)) return;
  if (/^(localhost|127\.|192\.168\.|10\.|\[::1\])/.test(location.hostname) && !/[?&]sw=1/.test(location.search)) return;
  window.addEventListener('load', () => {
    const base = new URL('../', SRC);
    navigator.serviceWorker.register(new URL('sw.js', base).href, { scope: base.pathname }).catch((e) => console.warn('service worker:', e));
  });
})();
