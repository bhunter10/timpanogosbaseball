var adminBasePath = window.__SITE_BASE_PATH || '';

window.defaultCarouselPhotos = [
  adminBasePath + '/photos/optimized/1.jpg',
  adminBasePath + '/photos/optimized/2.jpg',
  adminBasePath + '/photos/optimized/3.jpg',
  adminBasePath + '/photos/optimized/4.jpg',
  adminBasePath + '/photos/optimized/5.jpg',
  adminBasePath + '/photos/optimized/6.jpg',
  adminBasePath + '/photos/optimized/7.jpg',
  adminBasePath + '/photos/optimized/8.jpg',
  adminBasePath + '/photos/optimized/9.jpg'
].map(function(src) {
  return { src: src, alt: 'Team photo' };
});

if (!window.location.hash) {
  window.location.hash = '#admin';
}

document.addEventListener('adminauthchange', function() {
  if (!authReady) return;

  if (!currentAdminUser) {
    window.location.replace(adminBasePath + '/admin-login/');
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
