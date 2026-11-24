// Registra o service worker (sw.js, na raiz do site). Só no site publicado (HTTPS):
// no Live Server/localhost não registra, para o cache não segurar versões velhas enquanto você testa.
// Para testar o modo offline localmente, abra com ?sw=1 na URL.
(function () {
  const SCRIPT_SRC = document.currentScript ? document.currentScript.src : location.href;   // precisa ser lido já (no load não existe mais)
  if (!('serviceWorker' in navigator)) return;
  const local = /^(localhost|127\.|192\.168\.|\[::1\])/.test(location.hostname);
  if (local && !/[?&]sw=1/.test(location.search)) return;
  window.addEventListener('load', () => {
    const base = new URL('../', SCRIPT_SRC);
    navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname }).catch(() => {});
  });
})();
