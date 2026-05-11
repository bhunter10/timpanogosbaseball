import Script from 'next/script';
import BodyClass from '../components/BodyClass';
import { readLegacyBody } from '../lib/legacy-html';

export const metadata = {
  title: 'Timpanogos Admin Login'
};

export default async function AdminLoginPage() {
  const body = await readLegacyBody('admin-login.html');

  return (
    <>
      <BodyClass className="admin-v2-login-body admin-v2-login-body--dark" />
      <link rel="stylesheet" href="/css/admin.css" />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js" strategy="afterInteractive" />
      <Script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js" strategy="afterInteractive" />
      <Script src="/js/firebase-config.js" strategy="afterInteractive" />
      <Script src="/js/admin-login.js" strategy="afterInteractive" />
    </>
  );
}
