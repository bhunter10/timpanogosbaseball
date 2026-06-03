var adminBasePath = window.__SITE_BASE_PATH || '';

window.__ADMIN_STANDALONE_PAGE = true;

function clearStandaloneAdminHash() {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

clearStandaloneAdminHash();

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

document.addEventListener('adminauthchange', function() {
  if (!authReady) return;

  if (!currentAdminUser) {
    window.location.replace(adminBasePath + '/admin-login/');
    return;
  }

  document.body.classList.remove('auth-pending');
  clearStandaloneAdminHash();
});

document.addEventListener('DOMContentLoaded', function() {
  if (authReady && currentAdminUser) {
    document.body.classList.remove('auth-pending');
  }
});
