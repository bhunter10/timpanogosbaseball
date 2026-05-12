/** @type {import('next').NextConfig} */
const repoName = 'timpanogosbaseball';
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true' && process.env.VERCEL !== '1';
const basePath = isGitHubPagesBuild ? `/${repoName}` : '';

const nextConfig = {
  output: isGitHubPagesBuild ? 'export' : undefined,
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath
  }
};

module.exports = nextConfig;
