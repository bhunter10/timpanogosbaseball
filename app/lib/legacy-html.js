import fs from 'node:fs/promises';
import path from 'node:path';
import { withBasePath } from './base-path';

const LEGACY_FILES = {
  'index.html': 'index.html',
  'admin.html': 'admin.html',
  'admin-login.html': 'admin-login.html'
};

const PAGE_LINKS = {
  info: '/info',
  schedule: '/schedule',
  records: '/records',
  news: '/news',
  v2Filmstrip: '/gallery',
  roster: '/roster',
  swag: '/swag'
};

export async function readLegacyBody(fileName) {
  const legacyFile = LEGACY_FILES[fileName];
  if (!legacyFile) throw new Error('Unsupported legacy HTML file: ' + fileName);

  const html = await fs.readFile(path.join(/* turbopackIgnore: true */ process.cwd(), legacyFile), 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  return rewriteLegacyBody(body);
}

export async function readLegacyPage(fileName, sectionKeys) {
  const body = await readLegacyBody(fileName);
  const mainMatch = body.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  if (!mainMatch) return rewritePageLinks(body);

  const mainHtml = mainMatch[0];
  const openMatch = mainHtml.match(/^<main\b[^>]*>/i);
  const mainOpen = openMatch ? openMatch[0] : '<main>';
  const mainInner = mainHtml
    .replace(/^<main\b[^>]*>/i, '')
    .replace(/<\/main>$/i, '');
  const sections = getTopLevelSections(mainInner);
  const wanted = new Set(sectionKeys);
  const selectedSections = sections
    .filter(function(section) {
      return wanted.has(section.key);
    })
    .map(function(section) {
      return section.html;
    })
    .join('\n\n');

  return rewritePageLinks(
    body.slice(0, mainMatch.index) +
    mainOpen +
    '\n' +
    selectedSections +
    '\n</main>' +
    body.slice(mainMatch.index + mainMatch[0].length)
  );
}

function rewriteLegacyBody(body) {
  const rewritten = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\b(src|href)="images\//g, '$1="/images/')
    .replace(/\b(src|href)="photos\//g, '$1="/photos/')
    .replace(/\bsrcset="images\//g, 'srcset="/images/')
    .replace(/\bsrcset="photos\//g, 'srcset="/photos/')
    .replace(/, images\//g, ', /images/')
    .replace(/, photos\//g, ', /photos/')
    .replace(/\bhref="index\.html"/g, 'href="/"')
    .replace(/\bhref="admin-login\.html"/g, 'href="/admin-login"')
    .replace(/\bhref="admin\.html/g, 'href="/admin')
    .trim();

  return rewritten
    .replace(/\b(src|href)="\/(?!\/)([^"]*)"/g, function(_, attr, url) {
      return attr + '="' + withBasePath('/' + url) + '"';
    })
    .replace(/\bsrcset="([^"]*)"/g, function(_, srcset) {
      return 'srcset="' + srcset.replace(/(^|,\s*)\/([^,\s]+)/g, function(__, prefix, url) {
        return prefix + withBasePath('/' + url);
      }) + '"';
    });
}

function rewritePageLinks(body) {
  return body
    .replace(/\s*<a href="#info">Info<\/a>/g, '')
    .replace(/\bhref="#top"/g, 'href="' + withBasePath('/') + '"')
    .replace(/\bhref="#info"/g, 'href="' + withBasePath(PAGE_LINKS.schedule) + '"')
    .replace(/\bhref="#culture"/g, 'href="' + withBasePath('/') + '#culture"')
    .replace(/\bhref="#schedule"/g, 'href="' + withBasePath(PAGE_LINKS.schedule) + '"')
    .replace(/\bhref="#records"/g, 'href="' + withBasePath(PAGE_LINKS.records) + '"')
    .replace(/\bhref="#news"/g, 'href="' + withBasePath(PAGE_LINKS.news) + '"')
    .replace(/\bhref="#v2Filmstrip"/g, 'href="' + withBasePath(PAGE_LINKS.v2Filmstrip) + '"')
    .replace(/\bhref="#roster"/g, 'href="' + withBasePath(PAGE_LINKS.roster) + '"')
    .replace(/\bhref="#swag"/g, 'href="' + withBasePath(PAGE_LINKS.swag) + '"');
}

function getTopLevelSections(html) {
  const sections = [];
  const sectionTag = /<\/?section\b[^>]*>/gi;
  let depth = 0;
  let start = -1;
  let openingTag = '';
  let match;

  while ((match = sectionTag.exec(html))) {
    const tag = match[0];
    const isClosing = tag.startsWith('</');

    if (!isClosing) {
      if (depth === 0) {
        start = match.index;
        openingTag = tag;
      }
      depth += 1;
      continue;
    }

    depth -= 1;
    if (depth === 0 && start !== -1) {
      sections.push({
        key: getSectionKey(openingTag),
        html: html.slice(start, sectionTag.lastIndex)
      });
      start = -1;
      openingTag = '';
    }
  }

  return sections;
}

function getSectionKey(openingTag) {
  const idMatch = openingTag.match(/\bid="([^"]+)"/i);
  if (idMatch) return idMatch[1];
  const classMatch = openingTag.match(/\bclass="([^"]+)"/i);
  if (classMatch && classMatch[1].split(/\s+/).includes('v2-hero-rail-band')) {
    return 'identity-rail';
  }
  return '';
}
