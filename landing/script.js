// Menu mobile
const toggleBtn = document.getElementById('nav-toggle');
const nav = document.getElementById('main-nav');

if (toggleBtn && nav) {
  toggleBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// Botão de copiar o código de mundo de exemplo
const copyBtn = document.getElementById('btn-copy-seed');
const seedEl = document.getElementById('seed-preview');
const feedbackEl = document.getElementById('copy-feedback');

if (copyBtn && seedEl) {
  copyBtn.addEventListener('click', async () => {
    const code = seedEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(code);
      if (feedbackEl) feedbackEl.textContent = `Código ${code} copiado!`;
    } catch {
      if (feedbackEl) feedbackEl.textContent = `Código: ${code}`;
    }
    setTimeout(() => {
      if (feedbackEl) feedbackEl.textContent = '';
    }, 2500);
  });
}