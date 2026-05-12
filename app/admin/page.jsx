import Script from 'next/script';
import BodyClass from '../components/BodyClass';
import { readLegacyBody } from '../lib/legacy-html';
import { withBasePath } from '../lib/base-path';

export const metadata = {
  title: 'Timpanogos Admin'
};

export default async function AdminPage() {
  const body = await readLegacyBody('admin.html');

  return (
    <>
      <BodyClass className="admin-v2-body auth-pending" />
      <link rel="stylesheet" href={withBasePath('/v1/css/style.css')} />
      <link rel="stylesheet" href={withBasePath('/css/admin.css')} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script src={withBasePath('/js/firebase-config.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/js/flip.min.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/v1/js/carousel.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/v1/js/app.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/js/admin-shell.js')} strategy="afterInteractive" />
    </>
  );
}
