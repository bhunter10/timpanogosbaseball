document.addEventListener('DOMContentLoaded', () => {
  const photos = ['photos/optimized/1.jpg','photos/optimized/2.jpg','photos/optimized/3.jpg','photos/optimized/4.jpg','photos/optimized/5.jpg','photos/optimized/6.jpg','photos/optimized/7.jpg','photos/optimized/8.jpg','photos/optimized/9.jpg'];
  const perPage = 3;
  const totalPages = Math.ceil(photos.length / perPage);
  let page = 0, autoTimer;

  const carousel = document.querySelector('.carousel');
  const track = document.querySelector('.carousel-track');
  const dots = document.querySelector('.carousel-dots');

  for (let i = 0; i < totalPages; i++) {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    photos.slice(i * perPage, i * perPage + perPage).forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Team photo';
      img.loading = 'lazy';
      slide.appendChild(img);
    });
    track.appendChild(slide);
  }

  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Photo set ${i + 1}`);
    dot.addEventListener('click', () => { goTo(i); resetAuto(); });
    dots.appendChild(dot);
  }

  function goTo(i) {
    page = ((i % totalPages) + totalPages) % totalPages;
    track.style.transform = `translateX(-${page * 100}%)`;
    dots.querySelectorAll('.carousel-dot').forEach((d, idx) =>
      d.classList.toggle('active', idx === page));
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(page + 1), 5000);
  }

  document.querySelector('.carousel-prev').addEventListener('click', () => { goTo(page - 1); resetAuto(); });
  document.querySelector('.carousel-next').addEventListener('click', () => { goTo(page + 1); resetAuto(); });

  carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
  carousel.addEventListener('mouseleave', resetAuto);

  resetAuto();
});
