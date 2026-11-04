export const dynamic = 'force-static';

const SITE_URL = 'https://timpanogosbaseball.com';

const routes = [
  '',
  '/schedule',
  '/records',
  '/news',
  '/gallery',
  '/roster',
  '/training',
  '/swag',
  '/shop',
  '/info'
];

export default function sitemap() {
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7
  }));
}
