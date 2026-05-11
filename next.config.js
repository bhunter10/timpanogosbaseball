/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: false
      },
      {
        source: '/admin.html',
        destination: '/admin',
        permanent: false
      },
      {
        source: '/admin-login.html',
        destination: '/admin-login',
        permanent: false
      }
    ];
  }
};

module.exports = nextConfig;
