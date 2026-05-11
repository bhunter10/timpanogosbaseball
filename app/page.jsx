import Script from 'next/script';
import BodyClass from './components/BodyClass';
import { readLegacyBody } from './lib/legacy-html';

export default async function HomePage() {
  const body = await readLegacyBody('index.html');

  return (
    <>
      <BodyClass />
      <link rel="stylesheet" href="/css/flip.min.css" />
      <link rel="stylesheet" href="/css/style-v2.css" />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js" strategy="afterInteractive" />
      <Script src="/js/firebase-config.js" strategy="afterInteractive" />
      <Script src="/js/flip.min.js" strategy="afterInteractive" />
      <Script src="/js/app-v2.js" strategy="afterInteractive" />
    </>
  );
}
