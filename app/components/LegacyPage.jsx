import Script from 'next/script';
import BodyClass from './BodyClass';
import { readLegacyPage } from '../lib/legacy-html';
import { withBasePath } from '../lib/base-path';

export default async function LegacyPage({ sections, catalogHtml }) {
  let body = await readLegacyPage('index.html', sections);
  if (catalogHtml) body = body.replace('<div id="shop-catalog"></div>', catalogHtml);

  return (
    <>
      <BodyClass />
      <link rel="stylesheet" href={withBasePath('/css/flip.min.css')} />
      <link rel="stylesheet" href={withBasePath('/css/style-v2.css')} />
      {catalogHtml && <link rel="stylesheet" href={withBasePath('/css/shop.css')} />}
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script src={withBasePath('/js/firebase-config.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/js/flip.min.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/js/app-v2.js')} strategy="afterInteractive" />
      {catalogHtml && <Script src={withBasePath('/js/shop-filters.js')} strategy="afterInteractive" />}
    </>
  );
}
