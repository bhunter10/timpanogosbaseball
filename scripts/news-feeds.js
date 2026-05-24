const FEEDS = [
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

const MAX_ARTICLES = 24;
const OG_IMAGE_LIMIT = 12;
const FETCH_TIMEOUT_MS = 10000;
const OG_FETCH_TIMEOUT_MS = 2500;
const URL_RESOLVE_TIMEOUT_MS = 4000;

const QUALITY_HOSTS = ['heraldextra.com', 'ksl.com', 'deseret.com', 'sltrib.com'];

const SOURCE_LABELS = {
  'ksl.com': 'KSL',
  'deseret.com': 'Deseret News',
  'heraldextra.com': 'Daily Herald',
  'sltrib.com': 'Salt Lake Tribune',
  'maxpreps.com': 'MaxPreps',
  'google.com': 'Google News'
};

const OUTLET_FALLBACKS = {
  'ksl.com': '/images/outlets/ksl.svg',
  'deseret.com': '/images/outlets/deseret.svg',
  'heraldextra.com': '/images/outlets/herald.svg',
  'sltrib.com': '/images/outlets/generic.svg',
  'maxpreps.com': '/images/outlets/generic.svg',
  'google.com': '/images/outlets/generic.svg',
  default: '/images/outlets/generic.svg'
};

/** Always included — flagship feature stories with direct outlet links */
const CURATED_ARTICLES = [
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

const SEED_ARTICLES = CURATED_ARTICLES.slice();

function isRelevantArticle(text) {
  const haystack = String(text || '').toLowerCase();
  if (!/timpanogos|timberwolves/.test(haystack)) return false;
  if (/\bbaseball\b/.test(haystack)) return true;
  if (/timpanogos/.test(haystack) && /kim nelson/.test(haystack) && /coach/.test(haystack)) return true;
  return false;
}

function isQualityHost(url) {
  const host = getHostname(url);
  return QUALITY_HOSTS.some(function(part) {
    return host === part || host.endsWith('.' + part);
  });
}

function isLowQualityArticle(article) {
  const title = String(article.title || '');
  const link = String(article.link || '').toLowerCase();
  const excerpt = String(article.excerpt || '');
  const combined = (title + ' ' + excerpt + ' ' + link).toLowerCase();

  if (article.curated) return false;

  if (/maxpreps\.com|sportsillustrated|si\.com|googleusercontent\.com\/J6_coFbog/.test(link)) {
    return true;
  }

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

  if (/\bvs\.?\s+.+\s+baseball\b/i.test(title) && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(title)) {
    return true;
  }

  if (/\d{4}\s*-\s*sports illustrated/i.test(title)) return true;

  if (excerpt.length < 50 && !isQualityHost(link)) return true;

  return false;
}

function isValidKslArticleLink(link) {
  return /https?:\/\/www\.ksl\.com\/article\//i.test(String(link || ''));
}

function withOutboundLink(article) {
  const link = String(article.link || '').trim();
  return Object.assign({}, article, { link: link });
}

function scoreArticle(article) {
  if (isLowQualityArticle(article)) return -1000;

  let score = 0;
  const link = String(article.link || '');
  const host = getHostname(link);

  if (article.curated) score += 200;
  if (host.endsWith('heraldextra.com')) score += 50;
  if (host.endsWith('ksl.com')) score += 45;
  if (host.endsWith('deseret.com')) score += 45;
  if (/\/sports\/high-school\//.test(link)) score += 25;
  if (/ksl\.com\/article\//.test(link)) score += 20;

  const excerptLen = (article.excerpt || '').length;
  if (excerptLen > 100) score += 10;
  if (excerptLen > 180) score += 10;

  if (/\bbaseball\b/i.test(article.title)) score += 20;

  if (/(championship|coach of the|state title|national coach|brothers|fundamentals)/i.test(article.title)) {
    score += 15;
  }

  if (/\b(powers past|earn|named|dethrones|eliminates)\b/i.test(article.title)) {
    score += 8;
  }

  return score;
}

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

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'oc'].forEach(function(key) {
      parsed.searchParams.delete(key);
    });
    return parsed.toString();
  } catch (error) {
    return String(url || '').trim();
  }
}

function resolveGoogleNewsLink(link) {
  const raw = String(link || '');
  if (!raw.includes('news.google.com')) return raw;
  const match = raw.match(/url=([^&]+)/i);
  if (!match) return raw;
  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    return raw;
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
  const host = getHostname(url);
  if (!host) return 'News';
  const key = Object.keys(SOURCE_LABELS).find(function(part) {
    return host.endsWith(part);
  });
  return key ? SOURCE_LABELS[key] : host;
}

function getOutletFallback(url) {
  const host = getHostname(url);
  const key = Object.keys(OUTLET_FALLBACKS).find(function(part) {
    return host.endsWith(part);
  });
  return key ? OUTLET_FALLBACKS[key] : OUTLET_FALLBACKS.default;
}

function extractImageFromItem(item) {
  if (!item || typeof item !== 'object') return '';

  const media = item['media:content'] || item.media || item.enclosure;
  if (Array.isArray(media)) {
    for (let i = 0; i < media.length; i += 1) {
      const url = media[i] && (media[i]['@_url'] || media[i].url);
      if (url) return String(url);
    }
  } else if (media && (media['@_url'] || media.url)) {
    return String(media['@_url'] || media.url);
  }

  const imgMatch = String(item.description || item.summary || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return '';
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isUnresolvedGoogleLink(link) {
  return /news\.google\.com/i.test(String(link || ''));
}

function normalizeTitleKey(title) {
  return String(title || '')
    .replace(/\s+-\s+(heraldextra|ksl|deseret)\.com$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function slugifyTitle(title) {
  return normalizeTitleKey(title)
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HERALD_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function buildHeraldUrl(title, pubDate) {
  const slug = slugifyTitle(title);
  if (!slug) return '';

  const date = pubDate ? new Date(pubDate) : null;
  if (!date || isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = HERALD_MONTHS[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  return 'https://www.heraldextra.com/sports/high-school/' + year + '/' + month + '/' + day + '/' + slug + '/';
}

function findCuratedByTitle(title) {
  const key = normalizeTitleKey(title);
  return CURATED_ARTICLES.find(function(article) {
    return normalizeTitleKey(article.title) === key;
  });
}

function cleanArticleTitle(title) {
  return String(title || '')
    .replace(/\s+-\s+(heraldextra|ksl|deseret)\.com$/i, '')
    .replace(/\s+-\s+Google News$/i, '')
    .trim();
}

module.exports = {
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
  scoreArticle,
  stripHtml,
  normalizeUrl,
  resolveGoogleNewsLink,
  getHostname,
  getSourceLabel,
  getOutletFallback,
  extractImageFromItem,
  toArray,
  isUnresolvedGoogleLink,
  normalizeTitleKey,
  slugifyTitle,
  buildHeraldUrl,
  findCuratedByTitle,
  cleanArticleTitle,
  isValidKslArticleLink,
  withOutboundLink
};
