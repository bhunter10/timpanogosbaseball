(() => {
  const catalog = document.querySelector('.shop-catalog');
  if (!catalog || catalog.querySelector('.shop-pagination')) return;
  const cards = Array.from(catalog.querySelectorAll('.shop-card'));
  const pageSize = 12;
  const pageCount = Math.ceil(cards.length / pageSize);
  if (pageCount <= 1) return;

  const nav = document.createElement('nav');
  nav.className = 'shop-pagination';
  nav.setAttribute('aria-label', 'Product pages');
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.textContent = '‹';
  previous.setAttribute('aria-label', 'Previous page');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const next = document.createElement('button');
  next.type = 'button';
  next.textContent = '›';
  next.setAttribute('aria-label', 'Next page');
  const numbers = document.createElement('div');
  numbers.className = 'shop-page-numbers';
  const pageButtons = Array.from({ length: pageCount }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(index + 1);
    button.setAttribute('aria-label', `Page ${index + 1}`);
    button.addEventListener('click', () => showPage(index + 1, true));
    numbers.append(button);
    return button;
  });
  status.className = 'shop-page-status';
  nav.append(previous, numbers, next);
  catalog.append(nav, status);

  let page = 1;
  function showPage(value, scroll = false) {
    page = Math.max(1, Math.min(pageCount, value));
    const start = (page - 1) * pageSize;
    cards.forEach((card, index) => { card.hidden = index < start || index >= start + pageSize; });
    status.textContent = `Page ${page} of ${pageCount} · ${start + 1}–${Math.min(start + pageSize, cards.length)} of ${cards.length} products`;
    previous.disabled = page === 1;
    next.disabled = page === pageCount;
    pageButtons.forEach((button, index) => {
      if (index + 1 === page) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (scroll) {
      const firstLink = cards[start].querySelector('a');
      firstLink.focus({ preventScroll: true });
      cards[start].scrollIntoView({ block: 'start' });
    }
  }
  previous.addEventListener('click', () => showPage(page - 1, true));
  next.addEventListener('click', () => showPage(page + 1, true));
  showPage(1);
})();
