function initAdminLogin() {
  var form = document.getElementById('adminV2LoginForm');
  if (!form || form._adminLoginWired) return;
  form._adminLoginWired = true;
  var basePath = window.__SITE_BASE_PATH || '';
  var redirectPath = adminLoginRedirectPath();

  function adminLoginRedirectPath() {
    var fallback = basePath + '/admin/';
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    if (!next) return fallback;

    try {
      var url = new URL(next, window.location.origin);
      var adminPrefix = basePath + '/admin/';
      var adminRoot = basePath + '/admin';
      var loginPrefix = basePath + '/admin-login';
      if (url.origin !== window.location.origin) return fallback;
      if (url.pathname.indexOf(loginPrefix) === 0) return fallback;
      if (url.pathname === adminRoot || url.pathname.indexOf(adminPrefix) === 0) {
        return url.pathname + url.search + url.hash;
      }
    } catch (error) {}

    return fallback;
  }

  document.addEventListener('adminauthchange', function() {
    if (authReady && currentAdminUser) {
      window.location.replace(redirectPath);
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
      window.location.replace(redirectPath);
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
