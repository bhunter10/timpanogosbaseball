document.addEventListener('DOMContentLoaded', () => {
  const defaultPhotos = ['../photos/optimized/1.jpg','../photos/optimized/2.jpg','../photos/optimized/3.jpg','../photos/optimized/4.jpg','../photos/optimized/5.jpg','../photos/optimized/6.jpg','../photos/optimized/7.jpg','../photos/optimized/8.jpg','../photos/optimized/9.jpg'].map(src => ({
    src,
    alt: 'Team photo'
  }));
  window.defaultCarouselPhotos = defaultPhotos;

  let photos = defaultPhotos.slice();
  const mobileQuery = window.matchMedia('(max-width: 768px)');
  let perPage = mobileQuery.matches ? 1 : 3;
  let totalPages = Math.ceil(photos.length / perPage);
  let page = 0, autoTimer;
  let swipeStartX = 0;
  let swipeDeltaX = 0;
  let swipeActive = false;
  let hintedSwipe = false;

  const carousel = document.querySelector('.carousel');
  const track = document.querySelector('.carousel-track');
  const dots = document.querySelector('.carousel-dots');

  function normalizePhoto(photo) {
    if (typeof photo === 'string') return { src: photo, alt: 'Team photo' };
    return {
      src: photo && photo.src ? photo.src : '',
      alt: photo && photo.alt ? photo.alt : 'Team photo',
      storagePath: photo && photo.storagePath,
      sortOrder: photo && photo.sortOrder != null ? photo.sortOrder : 0,
      _key: photo && photo._key
    };
  }

  function setPhotos(nextPhotos, useSavedList) {
    photos = (nextPhotos || [])
      .map(normalizePhoto)
      .filter(photo => photo.src)
      .sort((a, b) => (+a.sortOrder || 0) - (+b.sortOrder || 0));
    if (!photos.length && !useSavedList) photos = defaultPhotos.slice();
    carousel.classList.toggle('carousel-empty', photos.length === 0);
    totalPages = Math.ceil(photos.length / perPage);
    page = Math.min(page, Math.max(totalPages - 1, 0));
    buildSlides();
    revealCarouselWhenReady();
    resetAuto();
  }

  function imageReady(img) {
    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth) {
      return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    }
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    }).then(() => img.decode ? img.decode().catch(() => {}) : undefined);
  }

  function revealCarouselWhenReady() {
    const firstSlide = track.querySelector('.carousel-slide');
    const firstImages = firstSlide ? Array.from(firstSlide.querySelectorAll('img')) : [];
    Promise.all(firstImages.map(imageReady)).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          carousel.classList.add('carousel-ready');
        });
      });
    });
  }

  function buildSlides() {
    carousel.classList.remove('carousel-ready');
    track.innerHTML = '';
    dots.innerHTML = '';
    perPage = mobileQuery.matches ? 1 : 3;
    totalPages = Math.ceil(photos.length / perPage);
    page = Math.min(page, Math.max(totalPages - 1, 0));

    for (let i = 0; i < totalPages; i++) {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      photos.slice(i * perPage, i * perPage + perPage).forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.src;
        img.alt = photo.alt || 'Team photo';
        img.width = photo.width || 800;
        img.height = photo.height || 533;
        img.decoding = 'async';
        img.loading = i === 0 ? 'eager' : 'lazy';
        if (i === 0) img.fetchPriority = 'high';
        slide.appendChild(img);
      });
      track.appendChild(slide);
    }

    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('span');
      dot.className = 'carousel-dot' + (i === page ? ' active' : '');
      dots.appendChild(dot);
    }
    dots.setAttribute('aria-label', `${perPage === 1 ? 'Photo' : 'Photo set'} ${page + 1} of ${totalPages}`);
    dots.classList.toggle('windowed', totalPages > 6);

    goTo(page);
  }

  function updateDots(activeIndex = page) {
    dots.querySelectorAll('.carousel-dot').forEach((dot, idx) => {
      const distance = Math.abs(idx - activeIndex);
      dot.classList.toggle('active', idx === activeIndex);
      dot.classList.toggle('near', distance === 1);
      dot.classList.toggle('far', distance === 2);
      dot.classList.toggle('distant', distance > 2);
    });
    dots.setAttribute('aria-label', `${perPage === 1 ? 'Photo' : 'Photo set'} ${activeIndex + 1} of ${totalPages}`);
    dots.classList.toggle('windowed', totalPages > 6);
    if (totalPages > 6) {
      const dotStep = 16;
      const visibleDots = 6;
      const centerIndex = Math.floor(visibleDots / 2);
      const maxOffset = 0;
      const minOffset = -Math.max(0, totalPages - visibleDots) * dotStep;
      const rawOffset = activeIndex <= centerIndex
        ? 0
        : activeIndex >= totalPages - centerIndex
          ? minOffset
          : (centerIndex - activeIndex) * dotStep;
      const offset = Math.max(minOffset, Math.min(maxOffset, rawOffset));
      dots.style.setProperty('--dot-offset', offset + 'px');
    } else {
      dots.style.setProperty('--dot-offset', '0px');
    }
  }

  function goTo(i) {
    if (!totalPages) return;
    page = ((i % totalPages) + totalPages) % totalPages;
    track.style.transform = `translateX(-${page * 100}%)`;
    updateDots();
  }

  function setTrackOffset(deltaX) {
    const width = carousel.getBoundingClientRect().width || 1;
    const offset = (deltaX / width) * 100;
    track.style.transform = `translateX(calc(-${page * 100}% + ${offset}%))`;
  }

  function startSwipe(clientX) {
    if (!mobileQuery.matches || totalPages < 2) return;
    swipeActive = true;
    swipeStartX = clientX;
    swipeDeltaX = 0;
    track.classList.add('dragging');
    clearInterval(autoTimer);
  }

  function moveSwipe(clientX) {
    if (!swipeActive) return;
    swipeDeltaX = clientX - swipeStartX;
    setTrackOffset(swipeDeltaX);
    const width = carousel.getBoundingClientRect().width || 1;
    const previewShift = Math.abs(swipeDeltaX) > width * 0.22 ? (swipeDeltaX < 0 ? 1 : -1) : 0;
    updateDots(((page + previewShift) % totalPages + totalPages) % totalPages);
  }

  function endSwipe() {
    if (!swipeActive) return;
    const width = carousel.getBoundingClientRect().width || 1;
    const threshold = Math.min(90, width * 0.18);
    track.classList.remove('dragging');
    if (Math.abs(swipeDeltaX) > threshold) {
      goTo(page + (swipeDeltaX < 0 ? 1 : -1));
    } else {
      goTo(page);
    }
    swipeActive = false;
    hintedSwipe = true;
    carousel.classList.remove('swipe-hint');
    swipeDeltaX = 0;
    resetAuto();
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(page + 1), 5000);
  }

  window.timpanogosCarousel = { setPhotos };

  document.querySelector('.carousel-prev').addEventListener('click', () => { goTo(page - 1); resetAuto(); });
  document.querySelector('.carousel-next').addEventListener('click', () => { goTo(page + 1); resetAuto(); });

  carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
  carousel.addEventListener('mouseleave', resetAuto);
  carousel.addEventListener('touchstart', e => startSwipe(e.touches[0].clientX), { passive: true });
  carousel.addEventListener('touchmove', e => moveSwipe(e.touches[0].clientX), { passive: true });
  carousel.addEventListener('touchend', endSwipe);
  carousel.addEventListener('touchcancel', endSwipe);
  mobileQuery.addEventListener('change', () => {
    buildSlides();
    revealCarouselWhenReady();
    resetAuto();
  });
  setTimeout(() => {
    if (mobileQuery.matches && totalPages > 1 && !hintedSwipe) carousel.classList.add('swipe-hint');
  }, 900);

  if (typeof fbGet === 'function') {
    fbGet('carouselPhotos').then(data => {
      if (data) setPhotos(fbToArray(data), true);
      else {
        buildSlides();
        revealCarouselWhenReady();
        resetAuto();
      }
    }).catch(err => {
      console.error('Carousel photos failed to load:', err);
      buildSlides();
      revealCarouselWhenReady();
      resetAuto();
    });
  } else {
    buildSlides();
    revealCarouselWhenReady();
    resetAuto();
  }
});
