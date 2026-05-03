window.defaultCarouselPhotos = [
  'photos/optimized/1.jpg',
  'photos/optimized/2.jpg',
  'photos/optimized/3.jpg',
  'photos/optimized/4.jpg',
  'photos/optimized/5.jpg',
  'photos/optimized/6.jpg',
  'photos/optimized/7.jpg',
  'photos/optimized/8.jpg',
  'photos/optimized/9.jpg'
].map(function(src) {
  return { src: src, alt: 'Team photo' };
});

if (!window.location.hash) {
  window.location.hash = '#admin';
}

document.addEventListener('adminauthchange', function() {
  if (!authReady) return;

  if (!currentAdminUser) {
    window.location.replace('admin-login.html');
    return;
  }

  document.body.classList.remove('auth-pending');

  if ((window.location.hash.slice(1) || '').toLowerCase() !== 'admin') {
    window.location.hash = '#admin';
  }
});

document.addEventListener('DOMContentLoaded', function() {
  if (authReady && currentAdminUser) {
    document.body.classList.remove('auth-pending');
  }
});
