import Script from 'next/script';

export const metadata = {
  title: 'Timpanogos Baseball',
  description: 'Schedules, results, roster, and team information for Timpanogos Baseball.'
};

export default function RootLayout({ children }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  return (
    <html lang="en">
      <head>
        <meta name="author" content="Jace Hunter" />
        <meta
          name="keywords"
          content="Timpanogos Baseball, Timpanogos High School Baseball, T-Wolves Baseball, Jace Hunter"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href={`${basePath}/images/twolves-wolf.svg`} type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SITE_BASE_PATH=${JSON.stringify(basePath)};`
          }}
        />
      </head>
      <body>
        <Script
          src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
