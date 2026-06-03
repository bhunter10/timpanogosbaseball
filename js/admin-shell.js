var adminBasePath = window.__SITE_BASE_PATH || '';

window.__ADMIN_STANDALONE_PAGE = true;

function clearStandaloneAdminHash() {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

function renderAdminHeaderAuth() {
  var authSlot = document.getElementById('adminHeaderAuth');
  if (!authSlot) return;

  authSlot.innerHTML = '';

  if (!authReady || !currentAdminUser) {
    authSlot.hidden = true;
    return;
  }

  var signedIn = document.createElement('span');
  signedIn.className = 'admin-v2-auth-user';
  signedIn.textContent = 'Signed in as ' + currentAdminUser.email;

  var signOutBtn = document.createElement('button');
  signOutBtn.type = 'button';
  signOutBtn.className = 'admin-v2-auth-signout';
  signOutBtn.textContent = 'Sign Out';
  signOutBtn.addEventListener('click', function() {
    fbSignOut().then(function() {
      window.location.replace(adminBasePath + '/admin-login/');
    });
  });

  authSlot.appendChild(signedIn);
  authSlot.appendChild(signOutBtn);
  authSlot.hidden = false;
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
  renderAdminHeaderAuth();

  if (!authReady) return;

  if (!currentAdminUser) {
    window.location.replace(adminBasePath + '/admin-login/');
    return;
  }

  document.body.classList.remove('auth-pending');
  clearStandaloneAdminHash();
});

document.addEventListener('DOMContentLoaded', function() {
  renderAdminHeaderAuth();

  if (authReady && currentAdminUser) {
    document.body.classList.remove('auth-pending');
  }
});

renderAdminHeaderAuth();
