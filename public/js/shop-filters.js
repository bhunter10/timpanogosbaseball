(() => {
  const catalog = document.querySelector('.shop-catalog');
  const filters = catalog?.querySelector('.shop-categories');
  if (!filters || filters.dataset.initialized) return;
  filters.dataset.initialized = 'true';
  const cards = Array.from(catalog.querySelectorAll('.shop-card'));
  const buttons = Array.from(filters.querySelectorAll('button[data-filter]'));
  const status = catalog.querySelector('.shop-filter-status');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      cards.forEach(card => {
        card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
      });
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      status.textContent = `Showing ${button.textContent.trim()}`;
    });
  });
  filters.hidden = false;
})();
