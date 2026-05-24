const fs = require('node:fs');
const path = require('node:path');
const { XMLParser } = require('fast-xml-parser');
const {
  FEEDS,
  MAX_ARTICLES,
  OG_IMAGE_LIMIT,
  FETCH_TIMEOUT_MS,
  OG_FETCH_TIMEOUT_MS,
  URL_RESOLVE_TIMEOUT_MS,
  CURATED_ARTICLES,
  SEED_ARTICLES,
  isRelevantArticle,
  isLowQualityArticle,
  stripHtml,
  normalizeUrl,
  resolveGoogleNewsLink,
  getSourceLabel,
  getOutletFallback,
  extractImageFromItem,
  toArray,
  isUnresolvedGoogleLink,
  buildHeraldUrl,
  findCuratedByTitle,
  cleanArticleTitle,
  isValidKslArticleLink,
  withOutboundLink
} = require('./news-feeds');

const outputPath = path.join(process.cwd(), 'public', 'data', 'news.json');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

async function fetchText(url, timeoutMs, method) {
  const controller = new AbortController();
  const timer = setTimeout(function() {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: method || 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'TimpanogosBaseballNewsBot/1.0 (+https://github.com/timpanogosbaseball)',
        Accept: 'application/rss+xml, application/xml, text/xml, text/html, */*'
      }
    });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return {
      text: await response.text(),
      url: response.url
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseFeedItems(xml) {
  const doc = parser.parse(xml);
  const channel = doc && doc.rss && doc.rss.channel;
  const atomFeed = doc && doc.feed;
  if (channel) return toArray(channel.item);
  if (atomFeed) return toArray(atomFeed.entry);
  return [];
}

function mapRssItem(item) {
  const rawLink = item && (item.link && (item.link['@_href'] || item.link) || item.guid);
  const link = resolveGoogleNewsLink(typeof rawLink === 'string' ? rawLink : String(rawLink || ''));
  const title = cleanArticleTitle(stripHtml(item && item.title));
  const description = stripHtml(item && (item.description || item.summary || item.content));
  const pubDateRaw = item && (item.pubDate || item.published || item.updated || item['dc:date']);
  const pubDate = pubDateRaw ? new Date(pubDateRaw).toISOString() : '';
  const image = extractImageFromItem(item);
  const sourceHint = item && item.source && item.source['#text'] ? String(item.source['#text']) : '';

  return {
    title: title,
    link: link,
    pubDate: pubDate,
    excerpt: description.replace(/\s+heraldextra\.com\s*$/i, '').replace(/\s+ksl\.com\s*$/i, '').slice(0, 280),
    image: image,
    source: getSourceLabel(link),
    sourceHint: sourceHint
  };
}

function isValidArticle(article) {
  return article && article.title && article.link && /^https?:\/\//i.test(article.link);
}

function mapDirectRssItem(item) {
  const link = typeof item.link === 'string' ? item.link.trim() : '';
  if (!isValidKslArticleLink(link)) return null;

  const title = cleanArticleTitle(stripHtml(item && item.title));
  const description = stripHtml(item && (item.description || item.summary || item.content));
  const pubDateRaw = item && (item.pubDate || item.published || item.updated);
  const pubDate = pubDateRaw ? new Date(pubDateRaw).toISOString() : '';

  return {
    title: title,
    link: link,
    pubDate: pubDate,
    excerpt: description.replace(/\s+ksl\.com\s*$/i, '').slice(0, 280),
    image: extractImageFromItem(item),
    source: 'KSL'
  };
}

async function verifyUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(URL_RESOLVE_TIMEOUT_MS),
      headers: {
        'User-Agent': 'TimpanogosBaseballNewsBot/1.0 (+https://github.com/timpanogosbaseball)'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function resolveArticleUrl(article) {
  const link = String(article.link || '');
  if (!link.includes('news.google.com')) {
    return normalizeUrl(link);
  }

  const curated = findCuratedByTitle(article.title);
  if (curated) {
    return normalizeUrl(curated.link);
  }

  const isHerald = /herald/i.test(article.sourceHint || '') || /herald/i.test(article.title + ' ' + article.excerpt);
  if (isHerald) {
    const guessed = buildHeraldUrl(article.title, article.pubDate);
    if (guessed && await verifyUrl(guessed)) {
      return guessed;
    }
  }

  const isKsl = /ksl/i.test(article.sourceHint || '') || /ksl/i.test(article.source || '');
  if (isKsl && isValidKslArticleLink(link)) {
    return normalizeUrl(link);
  }

  return '';
}

function parseMetaContent(html, property) {
  const match = html.match(new RegExp('<meta[^>]+property=["\']' + property + '["\'][^>]+content=["\']([^"\']+)["\']', 'i'))
    || html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']' + property + '["\']', 'i'));
  return match ? match[1] : '';
}

async function fetchOgMetadata(url) {
  try {
    const result = await fetchText(url, OG_FETCH_TIMEOUT_MS);
    const html = result.text;
    return {
      image: parseMetaContent(html, 'og:image'),
      description: parseMetaContent(html, 'og:description')
    };
  } catch (error) {
    return { image: '', description: '' };
  }
}

async function enrichImages(articles) {
  const targets = articles.filter(function(article) {
    return !article.image || article.image.indexOf('/images/outlets/') === 0;
  }).slice(0, OG_IMAGE_LIMIT);

  await Promise.all(targets.map(async function(article) {
    const meta = await fetchOgMetadata(article.link);
    if (meta.image && !/googleusercontent\.com\/J6_coFbog/i.test(meta.image)) {
      article.image = meta.image;
    }
    if (meta.description && (!article.excerpt || article.excerpt.length < 80)) {
      article.excerpt = stripHtml(meta.description).slice(0, 280);
    }
  }));

  return articles.map(function(article) {
    if (!article.image || /googleusercontent\.com\/J6_coFbog/i.test(article.image)) {
      article.image = getOutletFallback(article.link);
    }
    return article;
  });
}

async function fetchFeedArticles(feed) {
  try {
    const result = await fetchText(feed.url, FETCH_TIMEOUT_MS);
    const items = parseFeedItems(result.text);
    const mapper = feed.directLinks ? mapDirectRssItem : mapRssItem;

    return items
      .map(mapper)
      .filter(function(article) {
        return article && isValidArticle(article);
      })
      .filter(function(article) {
        return isRelevantArticle([article.title, article.excerpt, article.link].join(' '));
      })
      .filter(function(article) {
        return !isLowQualityArticle(article);
      });
  } catch (error) {
    console.warn('News feed failed (' + feed.id + '):', error && error.message ? error.message : error);
    return [];
  }
}

async function resolveAllLinks(articles) {
  const resolved = [];

  for (let i = 0; i < articles.length; i += 1) {
    const article = articles[i];
    const link = await resolveArticleUrl(article);
    if (!link) continue;

    resolved.push(Object.assign({}, article, {
      link: link,
      source: getSourceLabel(link)
    }));
  }

  return resolved;
}

function mergeArticles(curated, fetched) {
  const seen = new Set();
  const merged = [];

  function add(article) {
    const key = normalizeUrl(article.link);
    if (!key || seen.has(key)) return;
    if (isUnresolvedGoogleLink(key)) return;
    if (isLowQualityArticle(article)) return;
    seen.add(key);
    merged.push(withOutboundLink(Object.assign({}, article, { link: key })));
  }

  curated.forEach(add);
  fetched.forEach(add);

  merged.sort(function(a, b) {
    const aTime = Date.parse(a.pubDate || 0) || 0;
    const bTime = Date.parse(b.pubDate || 0) || 0;
    return bTime - aTime;
  });

  return merged.slice(0, MAX_ARTICLES);
}

async function fetchAllArticles() {
  const curated = CURATED_ARTICLES.map(function(article) {
    return Object.assign({}, article);
  });

  const batches = await Promise.all(FEEDS.map(fetchFeedArticles));
  const fetched = batches.flat();
  const resolved = await resolveAllLinks(fetched);
  const merged = mergeArticles(curated, resolved);

  if (!merged.length) return SEED_ARTICLES.map(withOutboundLink);
  return enrichImages(merged);
}

async function main() {
  const articles = await fetchAllArticles();
  const payload = {
    updatedAt: new Date().toISOString(),
    articles: articles
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote ' + articles.length + ' articles to public/data/news.json');
}

main().catch(function(error) {
  console.warn('Unable to fetch news feeds:', error && error.message ? error.message : error);
  const payload = {
    updatedAt: new Date().toISOString(),
    articles: SEED_ARTICLES.map(withOutboundLink)
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote seed articles to public/data/news.json');
});
