function initAdminLogin() {
  var form = document.getElementById('adminV2LoginForm');
  if (!form || form._adminLoginWired) return;
  form._adminLoginWired = true;
  var basePath = window.__SITE_BASE_PATH || '';

  document.addEventListener('adminauthchange', function() {
    if (authReady && currentAdminUser) {
      window.location.replace(basePath + '/admin/#admin');
    }
  });

  form.addEventListener('submit', function(event) {
    event.preventDefault();
    var errorEl = document.getElementById('authError');
    var submitBtn = form.querySelector('button[type="submit"]');
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';

    fbSignIn(
      document.getElementById('adminEmail').value,
      document.getElementById('adminPassword').value
    ).then(function() {
      window.location.replace(basePath + '/admin/#admin');
    }).catch(function(err) {
      errorEl.textContent = err && err.message ? err.message : 'Unable to sign in.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminLogin);
} else {
  initAdminLogin();
}
