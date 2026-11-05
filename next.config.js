const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');

/** @type {import('next').NextConfig} */
const repoName = 'timpanogosbaseball';
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true' && process.env.VERCEL !== '1';
const basePath = isGitHubPagesBuild ? `/${repoName}` : '';

const assetVersion = createHash('sha256')
  .update(readFileSync(path.join(__dirname, 'public/css/style-v2.css')))
  .update(readFileSync(path.join(__dirname, 'public/js/app-v2.js')))
  .digest('hex')
  .slice(0, 12);

const nextConfig = {
  output: isGitHubPagesBuild ? 'export' : undefined,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_ASSET_VERSION: assetVersion,
    NEXT_PUBLIC_STATIC_EXPORT: isGitHubPagesBuild ? 'true' : ''
  },
  async headers() {
    return [
      {
        source: '/api/:path*.ics',
        headers: [
          { key: 'Content-Type', value: 'text/calendar; charset=utf-8' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
