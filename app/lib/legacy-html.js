import fs from 'node:fs/promises';
import path from 'node:path';
import { withBasePath } from './base-path';

const LEGACY_FILES = {
  'index.html': 'index.html',
  'admin.html': 'admin.html',
  'admin-login.html': 'admin-login.html'
};

export async function readLegacyBody(fileName) {
  const legacyFile = LEGACY_FILES[fileName];
  if (!legacyFile) throw new Error('Unsupported legacy HTML file: ' + fileName);

  const html = await fs.readFile(path.join(/* turbopackIgnore: true */ process.cwd(), legacyFile), 'utf8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

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
