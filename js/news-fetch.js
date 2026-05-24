/* Browser news fetch — used from admin to refresh Firebase /news */
(function(global) {
  'use strict';

  var FEEDS = [
    {
      id: 'herald-google',
      url: 'https://news.google.com/rss/search?q=site:heraldextra.com+timpanogos+baseball&hl=en-US&gl=US&ceid=US:en'
    },
    {
      id: 'bing-ksl',
      url: 'https://www.bing.com/search?q=' + encodeURIComponent('site:ksl.com timpanogos baseball') + '&format=rss',
      directLinks: true
    },
    {
      id: 'deseret-google',
      url: 'https://news.google.com/rss/search?q=site:deseret.com+timpanogos+baseball&hl=en-US&gl=US&ceid=US:en'
    },
    {
      id: 'ksl',
      url: 'https://sports.ksl.com/prep/feed'
    }
  ];

  var MAX_ARTICLES = 24;
  var FETCH_TIMEOUT_MS = 12000;
  var URL_RESOLVE_TIMEOUT_MS = 5000;

  var SOURCE_LABELS = {
    'ksl.com': 'KSL',
    'deseret.com': 'Deseret News',
    'heraldextra.com': 'Daily Herald',
    'sltrib.com': 'Salt Lake Tribune'
  };

  var OUTLET_FALLBACKS = {
    'ksl.com': '/images/outlets/ksl.svg',
    'deseret.com': '/images/outlets/deseret.svg',
    'heraldextra.com': '/images/outlets/herald.svg',
    default: '/images/outlets/generic.svg'
  };

  var CURATED_ARTICLES = [
    {
      title: 'Band of brothers: Timpanogos powers past Provo, 6-2',
      link: 'https://www.heraldextra.com/sports/high-school/2026/apr/15/band-of-brothers-timpanogos-powers-past-provo-6-2/',
      pubDate: '2026-04-15T12:00:00.000Z',
      excerpt: 'The Timberwolves lean on their “Brothers” culture, Cooper Hawkes’ breakout season, and Canyon Clegg on the mound in a Region 8 win over Provo.',
      image: '',
      source: 'Daily Herald',
      curated: true
    },
    {
      title: 'High school baseball: Monday’s 4A bracket play roundup, Desert Hills, Bear River, Snow Canyon snag victories',
      link: 'https://www.deseret.com/sports/2026/05/11/high-school-baseball-4a-bracket-play-day-1/',
      pubDate: '2026-05-11T19:43:00.000Z',
      excerpt: 'Bear River and Timpanogos met in 4A bracket play, with the Deseret News roundup recapping the Bears’ 9-5 win over the Timberwolves.',
      image: '',
      source: 'Deseret News',
      curated: true
    },
    {
      title: 'High school baseball: 2026 4A team-by-team region capsules, predictions',
      link: 'https://www.deseret.com/sports/2026/03/01/high-school-baseball-region-2026-preseason-rankings-4a/',
      pubDate: '2026-03-01T18:20:00.000Z',
      excerpt: 'The Deseret News 4A preview tabs Timpanogos as a Region 8 favorite and highlights returning contributors for the Timberwolves.',
      image: '',
      source: 'Deseret News',
      curated: true
    },
    {
      title: 'High school baseball: Timpanogos, Salem Hills, Lehi, Woods Cross snag wins in Monday bracket play of 5A state tournament',
      link: 'https://www.deseret.com/2023/5/22/23731875/high-school-baseball-lehi-woods-cross-snag-wins-in-monday-bracket-play-of-5a-state-tournament/',
      pubDate: '2023-05-23T04:14:00.000Z',
      excerpt: 'Timpanogos opened 5A bracket play with a 13-4 win over Orem, using a quick start and a deep lineup to stay on the winning side.',
      image: '',
      source: 'Deseret News',
      curated: true
    },
    {
      title: 'Timpanogos coach Kim Nelson named 2022-23 National Baseball Coach of the Year',
      link: 'https://www.heraldextra.com/sports/high-school/2024/jan/18/timpanogos-coach-kim-nelson-named-national-coach-of-the-year/',
      pubDate: '2024-01-18T12:00:00.000Z',
      excerpt: 'Kim Nelson was named the NFHS National Coach of the Year — the only Utah coach honored nationally in 2022-23.',
      image: '',
      source: 'Daily Herald',
      curated: true
    },
    {
      title: 'Fundamentals and family earn Timpanogos baseball a 5A state championship win over Lehi',
      link: 'https://www.heraldextra.com/sports/high-school/2023/may/28/fundamentals-and-family-earn-timpanogos-baseball-a-5a-state-championship-win-over-lehi/',
      pubDate: '2023-05-28T12:00:00.000Z',
      excerpt: 'Chase Riggs’ complete game and a defense full of highlight plays sealed the Timberwolves’ seventh state title.',
      image: '',
      source: 'Daily Herald',
      curated: true
    },
    {
      title: 'Coach of a lifetime: Timpanogos\' Kim Nelson named 2023 NFHS baseball coach of the year',
      link: 'https://www.ksl.com/article/50846431/coach-of-a-lifetime-timpanogos-kim-nelson-named-2023-nfhs-baseball-coach-of-the-year',
      pubDate: '2024-01-18T12:00:00.000Z',
      excerpt: 'Kim Nelson was named the 2023 NFHS National Coach of the Year after eight state championships at Timpanogos.',
      image: '/images/outlets/ksl.svg',
      source: 'KSL',
      curated: true
    },
    {
      title: '5A baseball: Timpanogos squashes Lehi\'s momentum to take Game 1 win',
      link: 'https://www.ksl.com/article/50654321/5a-baseball-timpanogos-squashes-lehis-momentum-to-take-game-1-win',
      pubDate: '2023-05-26T12:00:00.000Z',
      excerpt: 'Billy Bird and Brighton Tate helped the Timberwolves take Game 1 of the 5A championship series against Lehi at UCCU Ballpark.',
      image: '',
      source: 'KSL',
      curated: true
    },
    {
      title: '5A baseball: Lehi forces Game 3, but Timpanogos rolls to another state title',
      link: 'https://www.ksl.com/article/50654723/5a-baseball-lehi-forces-game-3-but-timpanogos-rolls-to-another-state-title',
      pubDate: '2023-05-28T12:00:00.000Z',
      excerpt: 'The Timberwolves closed out their seventh state championship with a decisive win in the 5A title series finale.',
      image: '',
      source: 'KSL',
      curated: true
    },
    {
      title: 'Last Chance comeback: Timpanogos wins 6 games in 4 days to clinch 5A tourney title',
      link: 'https://www.ksl.com/article/sports/high-school/last-chance-comeback-timpanogos-wins-6-games-in-4-days-to-clinch-5a-tourney-title/46761895',
      pubDate: '2020-06-06T12:00:00.000Z',
      excerpt: 'Facing elimination, Timpanogos ran off six wins in four days to capture the 5A tournament championship.',
      image: '',
      source: 'KSL',
      curated: true
    },
    {
      title: '4A baseball: Hamilton homer helps Timpanogos down Spanish Fork, repeat as state champs',
      link: 'https://archive.sltrib.com/article.php?id=5313588&itype=CMSID',
      pubDate: '2017-05-27T05:20:00.000Z',
      excerpt: 'Casey Hamilton’s fifth-inning home run helped Timpanogos beat Spanish Fork 9-7 and repeat as Class 4A state champions.',
      image: '',
      source: 'Salt Lake Tribune',
      curated: true
    },
    {
      title: 'Prep baseball: Cornish provides dominant presence at plate, on mound for Timpanogos',
      link: 'https://archive.sltrib.com/article.php?id=5234016&itype=CMSID',
      pubDate: '2017-05-05T05:25:00.000Z',
      excerpt: 'The Salt Lake Tribune spotlighted TC Cornish’s all-around impact for a rolling Timpanogos team during the 2017 season.',
      image: 'https://archive.sltrib.com/images/2017/0504/pbase_cornish_050517~0.jpg',
      source: 'Salt Lake Tribune',
      curated: true
    },
    {
      title: 'Prep baseball: Timpanogos beats Orem for Class 4A state title',
      link: 'https://archive.sltrib.com/article.php?id=3922495&itype=CMSID',
      pubDate: '2016-06-09T21:21:00.000Z',
      excerpt: 'Timpanogos avenged Orem with 9-6 and 11-1 victories to claim the Class 4A state championship at UVU.',
      image: 'https://archive.sltrib.com/images/2016/0609/pbase_4Achamp_052816~39.jpg',
      source: 'Salt Lake Tribune',
      curated: true
    }
  ];

  var HERALD_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function stripHtml(value) {
    return String(value || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#(\d+);/g, function(_, code) {
        return String.fromCharCode(Number(code));
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanArticleTitle(title) {
    return String(title || '')
      .replace(/\s+-\s+(heraldextra|ksl|deseret)\.com$/i, '')
      .replace(/\s+-\s+Google News$/i, '')
      .trim();
  }

  function normalizeUrl(url) {
    try {
      var parsed = new URL(url);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'oc'].forEach(function(key) {
        parsed.searchParams.delete(key);
      });
      return parsed.toString();
    } catch (error) {
      return String(url || '').trim();
    }
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return '';
    }
  }

  function getSourceLabel(url) {
    var host = getHostname(url);
    if (!host) return 'News';
    var key = Object.keys(SOURCE_LABELS).find(function(part) {
      return host.endsWith(part);
    });
    return key ? SOURCE_LABELS[key] : host;
  }

  function getOutletFallback(url) {
    var host = getHostname(url);
    var key = Object.keys(OUTLET_FALLBACKS).find(function(part) {
      return host.endsWith(part);
    });
    return key ? OUTLET_FALLBACKS[key] : OUTLET_FALLBACKS.default;
  }

  function isRelevantArticle(text) {
    var haystack = String(text || '').toLowerCase();
    if (!/timpanogos|timberwolves/.test(haystack)) return false;
    if (/\bbaseball\b/.test(haystack)) return true;
    if (/timpanogos/.test(haystack) && /kim nelson/.test(haystack) && /coach/.test(haystack)) return true;
    return false;
  }

  function isLowQualityArticle(article) {
    var title = String(article.title || '');
    var link = String(article.link || '').toLowerCase();
    var excerpt = String(article.excerpt || '');
    var combined = (title + ' ' + excerpt + ' ' + link).toLowerCase();

    if (article.curated) return false;
    if (/maxpreps\.com|sportsillustrated|si\.com|googleusercontent\.com\/J6_coFbog/.test(link)) return true;
    if (/^schedule\s*-/i.test(title)) return true;
    if (/\broster\b/i.test(title) && !/championship|coach|title/i.test(title)) return true;
    if (/career home/i.test(title)) return true;
    if (/sports illustrated/i.test(combined)) return true;
    if (/\/watch\//i.test(link) || /youtube_videos|gamenightlive|\/scoreboard/i.test(link)) return true;
    if (/state playoffs.*scores and schedules/i.test(title)) return true;
    if (/streaming guide/i.test(title)) return true;
    if (/schedule\s*&\s*scoreboard/i.test(title)) return true;
    if (/baseball rankings$/i.test(title)) return true;
    if (/^video:/i.test(title)) return true;
    if (/\bvs\.?\s+.+\s+baseball\b/i.test(title) && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(title)) return true;
    return false;
  }

  function isValidKslArticleLink(link) {
    return /https?:\/\/www\.ksl\.com\/article\//i.test(String(link || ''));
  }

  function isUnresolvedGoogleLink(link) {
    return /news\.google\.com/i.test(String(link || ''));
  }

  function resolveGoogleNewsLink(link) {
    var raw = String(link || '');
    if (!raw.includes('news.google.com')) return raw;
    var match = raw.match(/url=([^&]+)/i);
    if (!match) return raw;
    try {
      return decodeURIComponent(match[1]);
    } catch (error) {
      return raw;
    }
  }

  function normalizeTitleKey(title) {
    return cleanArticleTitle(title).toLowerCase();
  }

  function slugifyTitle(title) {
    return normalizeTitleKey(title)
      .replace(/[''']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildHeraldUrl(title, pubDate) {
    var slug = slugifyTitle(title);
    if (!slug) return '';
    var date = pubDate ? new Date(pubDate) : null;
    if (!date || isNaN(date.getTime())) return '';
    return 'https://www.heraldextra.com/sports/high-school/' +
      date.getUTCFullYear() + '/' +
      HERALD_MONTHS[date.getUTCMonth()] + '/' +
      String(date.getUTCDate()).padStart(2, '0') + '/' +
      slug + '/';
  }

  function findCuratedByTitle(title) {
    var key = normalizeTitleKey(title);
    return CURATED_ARTICLES.find(function(article) {
      return normalizeTitleKey(article.title) === key;
    });
  }

  function fetchText(url, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function() {
      controller.abort();
    }, timeoutMs);

    return fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*'
      }
    }).then(function(response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    }).finally(function() {
      clearTimeout(timer);
    });
  }

  function verifyUrl(url) {
    var controller = new AbortController();
    var timer = setTimeout(function() {
      controller.abort();
    }, URL_RESOLVE_TIMEOUT_MS);

    return fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow'
    }).then(function(response) {
      return response.ok;
    }).catch(function() {
      return false;
    }).finally(function() {
      clearTimeout(timer);
    });
  }

  function textContent(node, selector) {
    if (!node) return '';
    var el = selector ? node.querySelector(selector) : node;
    return el ? stripHtml(el.textContent || '') : '';
  }

  function getLinkFromNode(node) {
    var linkEl = node.querySelector('link');
    if (!linkEl) return '';
    return linkEl.getAttribute('href') || stripHtml(linkEl.textContent || '');
  }

  function parseRssItems(xml) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    var nodes = Array.prototype.slice.call(doc.querySelectorAll('item'));
    if (!nodes.length) {
      nodes = Array.prototype.slice.call(doc.querySelectorAll('entry'));
    }

    return nodes.map(function(node) {
      var enclosure = node.querySelector('enclosure');
      var image = enclosure ? (enclosure.getAttribute('url') || '') : '';
      if (!image) {
        var html = node.querySelector('description, summary, content');
        var imgMatch = html && String(html.textContent || html.innerHTML || '').match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) image = imgMatch[1];
      }

      return {
        title: textContent(node, 'title'),
        link: getLinkFromNode(node),
        description: textContent(node, 'description') || textContent(node, 'summary') || textContent(node, 'content'),
        pubDate: textContent(node, 'pubDate') || textContent(node, 'published') || textContent(node, 'updated'),
        image: image,
        sourceHint: textContent(node, 'source')
      };
    });
  }

  function mapRssItem(item) {
    var link = resolveGoogleNewsLink(item.link || '');
    var pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : '';
    return {
      title: cleanArticleTitle(item.title),
      link: link,
      pubDate: pubDate,
      excerpt: String(item.description || '').replace(/\s+heraldextra\.com\s*$/i, '').replace(/\s+ksl\.com\s*$/i, '').slice(0, 280),
      image: item.image || '',
      source: getSourceLabel(link),
      sourceHint: item.sourceHint || ''
    };
  }

  function mapDirectRssItem(item) {
    var link = String(item.link || '').trim();
    if (!isValidKslArticleLink(link)) return null;
    var pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : '';
    return {
      title: cleanArticleTitle(item.title),
      link: link,
      pubDate: pubDate,
      excerpt: String(item.description || '').replace(/\s+ksl\.com\s*$/i, '').slice(0, 280),
      image: item.image || '',
      source: 'KSL'
    };
  }

  function resolveArticleUrl(article) {
    var link = String(article.link || '');
    if (!link.includes('news.google.com')) {
      return normalizeUrl(link);
    }

    var curated = findCuratedByTitle(article.title);
    if (curated) return normalizeUrl(curated.link);

    if (/herald/i.test(article.sourceHint || '') || /herald/i.test(article.title + ' ' + article.excerpt)) {
      var guessed = buildHeraldUrl(article.title, article.pubDate);
      if (guessed) {
        return verifyUrl(guessed).then(function(ok) {
          return ok ? guessed : '';
        });
      }
    }

    if (/ksl/i.test(article.sourceHint || '') && isValidKslArticleLink(link)) {
      return Promise.resolve(normalizeUrl(link));
    }

    return Promise.resolve('');
  }

  function fetchFeedArticles(feed) {
    return fetchText(feed.url, FETCH_TIMEOUT_MS).then(function(xml) {
      var items = parseRssItems(xml);
      var mapper = feed.directLinks ? mapDirectRssItem : mapRssItem;
      return items
        .map(mapper)
        .filter(function(article) {
          return article && article.title && article.link && /^https?:\/\//i.test(article.link);
        })
        .filter(function(article) {
          return isRelevantArticle([article.title, article.excerpt, article.link].join(' '));
        })
        .filter(function(article) {
          return !isLowQualityArticle(article);
        });
    }).catch(function() {
      return [];
    });
  }

  function resolveAllLinks(articles) {
    var chain = Promise.resolve([]);
    articles.forEach(function(article) {
      chain = chain.then(function(resolved) {
        return resolveArticleUrl(article).then(function(link) {
          if (!link) return resolved;
          resolved.push(Object.assign({}, article, {
            link: link,
            source: getSourceLabel(link)
          }));
          return resolved;
        });
      });
    });
    return chain;
  }

  function finalizeArticle(article) {
    var image = article.image;
    if (!image || /googleusercontent\.com\/J6_coFbog/i.test(image)) {
      image = getOutletFallback(article.link);
    }
    return {
      title: article.title,
      link: article.link,
      pubDate: article.pubDate || '',
      excerpt: article.excerpt || '',
      image: image,
      source: article.source || getSourceLabel(article.link)
    };
  }

  function mergeArticles(curated, fetched) {
    var seen = new Set();
    var merged = [];

    function add(article) {
      var key = normalizeUrl(article.link);
      if (!key || seen.has(key) || isUnresolvedGoogleLink(key) || isLowQualityArticle(article)) return;
      seen.add(key);
      merged.push(finalizeArticle(Object.assign({}, article, { link: key })));
    }

    curated.forEach(add);
    fetched.forEach(add);

    merged.sort(function(a, b) {
      return (Date.parse(b.pubDate || 0) || 0) - (Date.parse(a.pubDate || 0) || 0);
    });

    return merged.slice(0, MAX_ARTICLES);
  }

  function fetchAllArticles() {
    var curated = CURATED_ARTICLES.map(function(article) {
      return Object.assign({}, article);
    });

    return Promise.all(FEEDS.map(fetchFeedArticles)).then(function(batches) {
      var fetched = batches.reduce(function(all, batch) {
        return all.concat(batch);
      }, []);
      return resolveAllLinks(fetched).then(function(resolved) {
        var merged = mergeArticles(curated, resolved);
        if (!merged.length) {
          return CURATED_ARTICLES.map(finalizeArticle);
        }
        return merged;
      });
    });
  }

  global.TimpanogosNewsFetch = {
    fetchAllArticles: fetchAllArticles
  };
})(typeof window !== 'undefined' ? window : global);
