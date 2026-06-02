/**
 * Parse opponent school data from MaxPreps team schedule pages (__NEXT_DATA__).
 * Team tuples in each contest's teams array use fixed indices (observed 2026).
 */
const TIMPANOGOS_SCHOOL_ID = 'd1b51cea-e24a-4de9-aa09-1b7cbc7b4350';
const DEFAULT_HISTORY_URL = 'https://www.maxpreps.com/ut/orem/timpanogos-timberwolves/baseball/history/';
const FETCH_TIMEOUT_MS = 25000;
const USER_AGENT = 'TimpanogosBaseballSite/1.0 (+https://timpanogosbaseball.com)';

const TEAM = {
  schoolId: 1,
  url: 13,
  name: 14,
  city: 15,
  state: 16,
  street: 17,
  zip: 18,
  label: 19,
  logo: 20,
  mascot: 21
};

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(function() {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + url);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error('MaxPreps page did not include __NEXT_DATA__');
  }
  return JSON.parse(match[1]);
}

function parseTeamTuple(tuple) {
  if (!Array.isArray(tuple) || tuple.length <= TEAM.mascot) return null;
  const schoolId = tuple[TEAM.schoolId];
  const name = tuple[TEAM.name];
  if (!schoolId || !name) return null;
  return {
    maxprepsSchoolId: schoolId,
    schoolName: String(name).trim(),
    mascot: tuple[TEAM.mascot] ? String(tuple[TEAM.mascot]).trim() : '',
    city: tuple[TEAM.city] ? String(tuple[TEAM.city]).trim() : '',
    state: tuple[TEAM.state] ? String(tuple[TEAM.state]).trim() : '',
    street: tuple[TEAM.street] ? String(tuple[TEAM.street]).trim() : '',
    zip: tuple[TEAM.zip] ? String(tuple[TEAM.zip]).trim() : '',
    maxprepsUrl: tuple[TEAM.url] ? String(tuple[TEAM.url]).trim() : '',
    logoUrl: tuple[TEAM.logo] ? String(tuple[TEAM.logo]).trim() : ''
  };
}

function formatAddress(team) {
  const parts = [];
  if (team.street) parts.push(team.street);
  const cityLine = [team.city, team.state].filter(Boolean).join(', ');
  const cityZip = [cityLine, team.zip].filter(Boolean).join(' ');
  if (cityZip) parts.push(cityZip);
  return parts.join(', ');
}

function optimizeLogoUrl(url, size) {
  if (!url) return '';
  const dim = size || 256;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(dim));
    parsed.searchParams.set('height', String(dim));
    return parsed.toString();
  } catch (err) {
    return url;
  }
}

function extractOpponentsFromContests(contests, excludeSchoolId) {
  const exclude = excludeSchoolId || TIMPANOGOS_SCHOOL_ID;
  const byId = new Map();

  (contests || []).forEach(function(contest) {
    const teams = contest && contest[0];
    if (!Array.isArray(teams)) return;
    teams.forEach(function(tuple) {
      const team = parseTeamTuple(tuple);
      if (!team || team.maxprepsSchoolId === exclude) return;
      team.address = formatAddress(team);
      team.logoUrl = optimizeLogoUrl(team.logoUrl, 256);
      const existing = byId.get(team.maxprepsSchoolId);
      if (!existing) {
        byId.set(team.maxprepsSchoolId, team);
        return;
      }
      ['mascot', 'street', 'city', 'state', 'zip', 'maxprepsUrl', 'logoUrl', 'address'].forEach(function(field) {
        if (!existing[field] && team[field]) existing[field] = team[field];
      });
    });
  });

  return byId;
}

function getVarsitySeasons(pageProps) {
  const picker = pageProps && pageProps.teamContext && pageProps.teamContext.teamSeasonPickerData;
  if (!Array.isArray(picker)) return [];
  return picker.filter(function(season) {
    return season && season.level === 'Varsity' && season.sport === 'Baseball' && season.canonicalUrl;
  });
}

function scheduleUrlForSeason(season) {
  const base = String(season.canonicalUrl).replace(/\/?$/, '/');
  return base.indexOf('/schedule') !== -1 ? base : base + 'schedule/';
}

async function fetchOpponentsFromScheduleUrl(scheduleUrl, excludeSchoolId) {
  const html = await fetchHtml(scheduleUrl);
  const data = parseNextData(html);
  const contests = data.props && data.props.pageProps && data.props.pageProps.contests;
  return extractOpponentsFromContests(contests, excludeSchoolId);
}

async function fetchAllVarsityOpponents(options) {
  const opts = options || {};
  const historyUrl = opts.historyUrl || DEFAULT_HISTORY_URL;
  const excludeSchoolId = opts.excludeSchoolId || TIMPANOGOS_SCHOOL_ID;
  const delayMs = opts.delayMs == null ? 350 : opts.delayMs;
  const maxSeasons = opts.maxSeasons == null ? null : opts.maxSeasons;

  const historyHtml = await fetchHtml(historyUrl);
  const historyData = parseNextData(historyHtml);
  const pageProps = historyData.props && historyData.props.pageProps;
  let seasons = getVarsitySeasons(pageProps);
  if (maxSeasons != null) seasons = seasons.slice(0, maxSeasons);

  const merged = new Map();
  const seasonLog = [];

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i];
    const scheduleUrl = scheduleUrlForSeason(season);
    let opponents;
    try {
      opponents = await fetchOpponentsFromScheduleUrl(scheduleUrl, excludeSchoolId);
    } catch (err) {
      seasonLog.push({
        year: season.year,
        scheduleUrl: scheduleUrl,
        error: err.message || String(err)
      });
      if (delayMs) await sleep(delayMs);
      continue;
    }

    opponents.forEach(function(team, schoolId) {
      const existing = merged.get(schoolId);
      if (!existing) {
        merged.set(schoolId, team);
        return;
      }
      ['mascot', 'street', 'city', 'state', 'zip', 'maxprepsUrl', 'logoUrl', 'address'].forEach(function(field) {
        if (!existing[field] && team[field]) existing[field] = team[field];
      });
    });

    seasonLog.push({
      year: season.year,
      scheduleUrl: scheduleUrl,
      opponentsFound: opponents.size
    });

    if (delayMs && i < seasons.length - 1) await sleep(delayMs);
  }

  const opponents = Array.from(merged.values()).sort(function(a, b) {
    return a.schoolName.localeCompare(b.schoolName);
  });

  return {
    fetchedAt: new Date().toISOString(),
    historyUrl: historyUrl,
    seasonCount: seasons.length,
    opponentCount: opponents.length,
    seasons: seasonLog,
    opponents: opponents
  };
}

module.exports = {
  TIMPANOGOS_SCHOOL_ID,
  DEFAULT_HISTORY_URL,
  formatAddress,
  optimizeLogoUrl,
  parseTeamTuple,
  extractOpponentsFromContests,
  fetchOpponentsFromScheduleUrl,
  fetchAllVarsityOpponents
};
