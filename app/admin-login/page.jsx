import Script from 'next/script';
import BodyClass from '../components/BodyClass';
import { readLegacyBody } from '../lib/legacy-html';
import { withBasePath } from '../lib/base-path';

export const metadata = {
  title: 'Timpanogos Admin Login'
};

export default async function AdminLoginPage() {
  const body = await readLegacyBody('admin-login.html');

  return (
    <>
      <BodyClass className="admin-v2-login-body admin-v2-login-body--dark" />
      <link rel="stylesheet" href={withBasePath('/css/admin.css')} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script src={withBasePath('/js/firebase-config.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/js/admin-login.js')} strategy="afterInteractive" />
    </>
  );
}
