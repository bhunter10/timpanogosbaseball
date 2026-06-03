(function() {
  'use strict';

  function formatAdminTimestamp(value) {
    if (!value) return 'Never';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Denver'
    });
  }

  function setNewsStatus(message, isError) {
    var status = document.getElementById('adminNewsStatus');
    var error = document.getElementById('adminNewsError');
    if (status) {
      status.textContent = message || '';
      status.classList.toggle('save-success', !!message && !isError);
    }
    if (error) {
      error.textContent = isError ? (message || '') : '';
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sortArticlesByDate(articles) {
    return articles.slice().sort(function(a, b) {
      var aTime = Date.parse(a && a.pubDate || 0) || 0;
      var bTime = Date.parse(b && b.pubDate || 0) || 0;
      return bTime - aTime;
    });
  }

  function renderNewsPreview(articles) {
    var preview = document.getElementById('adminNewsPreview');
    if (!preview) return;

    if (!articles || !articles.length) {
      preview.innerHTML = '<li class="muted">No articles saved yet.</li>';
      return;
    }

    preview.innerHTML = sortArticlesByDate(articles).map(function(article) {
      return '<li><strong>' + escapeHtml(article.title) + '</strong>' +
        '<span class="muted admin-news-preview-meta">' +
        escapeHtml(article.source || 'News') + ' · ' + escapeHtml(formatAdminTimestamp(article.pubDate)) +
        '</span></li>';
    }).join('');
  }

  function normalizeArticles(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof fbToArray === 'function') return fbToArray(value);
    return Object.keys(value).map(function(key) {
      return value[key];
    }).filter(Boolean);
  }

  function normalizeArticleLink(value) {
    try {
      var parsed = new URL(String(value || ''));
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'oc'].forEach(function(key) {
        parsed.searchParams.delete(key);
      });
      return parsed.toString().toLowerCase();
    } catch (error) {
      return String(value || '').trim().toLowerCase();
    }
  }

  function normalizeArticleTitle(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function getArticleKeys(article) {
    var keys = [];
    var link = normalizeArticleLink(article && article.link);
    var title = normalizeArticleTitle(article && article.title);
    if (link) keys.push('link:' + link);
    if (title) keys.push('title:' + title);
    return keys;
  }

  function isGenericNewsImage(value) {
    var image = String(value || '').trim();
    return !image || image.indexOf('/images/outlets/') !== -1;
  }

  function buildArticleImageMap(articleGroups) {
    var imageMap = {};
    articleGroups.forEach(function(group) {
      normalizeArticles(group).forEach(function(article) {
        if (!article || isGenericNewsImage(article.image)) return;
        getArticleKeys(article).forEach(function(key) {
          if (!imageMap[key]) imageMap[key] = article.image;
        });
      });
    });
    return imageMap;
  }

  function preserveArticleImages(articles, articleGroups) {
    var imageMap = buildArticleImageMap(articleGroups);
    return normalizeArticles(articles).map(function(article) {
      if (!article || !isGenericNewsImage(article.image)) return article;
      var keys = getArticleKeys(article);
      for (var i = 0; i < keys.length; i += 1) {
        if (imageMap[keys[i]]) {
          return Object.assign({}, article, { image: imageMap[keys[i]] });
        }
      }
      return article;
    });
  }

  function loadAdminNewsStatus() {
    if (typeof fbGet !== 'function') {
      setNewsStatus('Firebase is not available.', true);
      return Promise.resolve();
    }

    return Promise.all([
      fbGet('news'),
      fbGet('siteMeta/newsUpdatedAt')
    ]).then(function(values) {
      var payload = values[0];
      var updatedAt = (payload && payload.updatedAt) || values[1] || '';
      var articles = payload ? normalizeArticles(payload.articles) : [];
      var lastEl = document.getElementById('adminNewsLastUpdated');
      var countEl = document.getElementById('adminNewsCount');

      if (lastEl) lastEl.textContent = formatAdminTimestamp(updatedAt);
      if (countEl) countEl.textContent = String(articles.length);
      renderNewsPreview(articles);
      setNewsStatus('', false);
    }).catch(function(error) {
      setNewsStatus(error && error.message ? error.message : 'Could not load news status.', true);
    });
  }

  function loadNewsJsonBackup() {
    var dataPath = (window.__SITE_BASE_PATH || '') + '/data/news.json';
    return fetch(dataPath).then(function(response) {
      if (!response.ok) throw new Error('Could not load /data/news.json');
      return response.json();
    }).then(function(payload) {
      var articles = normalizeArticles(payload && payload.articles);
      if (!articles.length) throw new Error('news.json has no articles');
      return articles;
    });
  }

  function refreshNewsArticles() {
    var button = document.getElementById('adminNewsRefreshBtn');
    if (!button) {
      setNewsStatus('News controls are not on the page yet. Refresh and try again.', true);
      return Promise.resolve();
    }
    if (typeof fbSet !== 'function') {
      setNewsStatus('Firebase is not available.', true);
      return Promise.resolve();
    }
    if (!window.TimpanogosNewsFetch) {
      setNewsStatus('News fetch script did not load. Check that js/news-fetch.js is deployed.', true);
      return Promise.resolve();
    }
    if (!currentAdminUser) {
      setNewsStatus('Sign in to update news.', true);
      return Promise.resolve();
    }

    var originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Updating…';
    setNewsStatus('Fetching Utah media feeds…', false);

    return window.TimpanogosNewsFetch.fetchAllArticles().then(function(articles) {
      if (!articles || !articles.length) {
        setNewsStatus('Live feeds returned nothing. Importing site backup from news.json…', false);
        return loadNewsJsonBackup();
      }
      return articles;
    }).then(function(articles) {
      if (!articles || !articles.length) {
        throw new Error('No articles were found. Run npm run fetch-news locally, then try again.');
      }

      return Promise.all([
        fbGet('news').catch(function() { return null; }),
        loadNewsJsonBackup().catch(function() { return []; })
      ]).then(function(previousValues) {
        var previousPayload = previousValues[0];
        var backupArticles = previousValues[1];
        var previousArticles = previousPayload ? normalizeArticles(previousPayload.articles) : [];
        var articlesWithImages = preserveArticleImages(articles, [previousArticles, backupArticles]);
        var payload = {
          updatedAt: new Date().toISOString(),
          articles: articlesWithImages
        };

        return fbSet('news', payload).then(function() {
          return db.ref('siteMeta/newsUpdatedAt').set(payload.updatedAt);
        }).then(function() {
          var lastEl = document.getElementById('adminNewsLastUpdated');
          var countEl = document.getElementById('adminNewsCount');
          if (lastEl) lastEl.textContent = formatAdminTimestamp(payload.updatedAt);
          if (countEl) countEl.textContent = String(articlesWithImages.length);
          renderNewsPreview(articlesWithImages);
          setNewsStatus('News updated. The public News page will show these articles immediately.', false);
        });
      });
    }).catch(function(error) {
      var message = error && error.message ? error.message : 'News refresh failed.';
      if (error && error.code === 'PERMISSION_DENIED') {
        message = 'Firebase denied the write. Add write access for /news in Realtime Database rules for signed-in admins.';
      }
      setNewsStatus(message + ' You can also run npm run fetch-news before deploy.', true);
      console.error('News refresh failed:', error);
    }).finally(function() {
      button.disabled = false;
      button.textContent = originalLabel;
    });
  }

  window.AdminNews = {
    loadStatus: loadAdminNewsStatus,
    refresh: refreshNewsArticles
  };

  document.addEventListener('click', function(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    if (!target.closest('#adminNewsRefreshBtn')) return;
    event.preventDefault();
    refreshNewsArticles();
  });
})();
