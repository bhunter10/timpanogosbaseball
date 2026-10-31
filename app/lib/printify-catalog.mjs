export const STORE_URL = 'https://timpanogos-baseball.printify.me';

// Featured color on our shop; kept separate from Printify's default preview.
const displayOverrides = {
  33793727: {
    image: '/images/team-nelson-pink.jpg',
    imageAlt: 'Team Nelson shirt in pink'
  }
};

// The public storefront embeds its catalog in Next.js Flight data. No private API is used.
export function parseCatalog(html) {
  const chunks = [];
  for (const match of html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)) {
    try {
      const [type, value] = JSON.parse(match[1]);
      if (type === 1 && typeof value === 'string') chunks.push(value);
    } catch { /* Ignore unrelated script data. */ }
  }
  const payload = chunks.join('');
  const marker = '"products":{"products":[';
  const start = payload.indexOf(marker);
  if (start < 0) throw new Error('Printify catalog data was not found');
  const offset = start + '"products":'.length;
  let depth = 0, quoted = false, escaped = false;
  for (let i = offset; i < payload.length; i++) {
    const char = payload[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      const catalog = JSON.parse(payload.slice(offset, i + 1));
      if (!Array.isArray(catalog.products) || !Number.isInteger(catalog.pagination?.pageCount)) {
        throw new Error('Invalid Printify catalog');
      }
      return catalog;
    }
  }
  throw new Error('Incomplete Printify catalog');
}

export function normalizeProduct(product) {
  if (!Number.isInteger(product.id) || typeof product.title !== 'string') throw new Error('Invalid product');
  const image = new URL(product.image);
  if (image.protocol !== 'https:' || image.hostname !== 'images-api.printify.com') throw new Error('Unexpected product image');
  const price = product.defaultVariant?.retailPrice;
  return {
    id: product.id,
    title: product.title,
    image: image.href,
    url: `${STORE_URL}/product/${product.id}`,
    price: Number.isFinite(price) && price >= 0 ? price : null,
    colors: (product.options || []).find(option => option.type === 'color')?.items?.length || 0
  };
}

export async function fetchCatalog(fetcher = fetch) {
  const products = new Map();
  let expectedTotal;
  for (let page = 1, pageCount = 1; page <= pageCount; page++) {
    const response = await fetcher(`${STORE_URL}/products?page=${page}`, {
      next: { revalidate: 60 }, signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Printify returned ${response.status}`);
    const catalog = parseCatalog(await response.text());
    pageCount = catalog.pagination.pageCount;
    if (pageCount < 0 || pageCount > 100 || catalog.pagination.page !== page) throw new Error('Invalid catalog pagination');
    expectedTotal = catalog.pagination.total;
    for (const product of catalog.products) products.set(product.id, normalizeProduct(product));
  }
  if (products.size !== expectedTotal) throw new Error('Incomplete catalog sync');
  return [...products.values()];
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderCatalog(products, saved = false) {
  // Keep Team Nelson last while preserving the storefront order for other gear.
  const orderedProducts = products.filter(item => item.id !== 33793727)
    .concat(products.filter(item => item.id === 33793727));
  const cards = orderedProducts.map((item, index) => {
    const product = { ...item, ...displayOverrides[item.id] };
    return `<article class="shop-card">
    <a class="shop-product-image" href="${escapeHtml(product.url)}"><img src="${escapeHtml(product.image.startsWith('/') ? (process.env.NEXT_PUBLIC_BASE_PATH || '') + product.image : product.image)}" alt="${escapeHtml(product.imageAlt || product.title)}" width="640" height="640" loading="${index === 0 ? 'eager' : 'lazy'}" ${index === 0 ? 'fetchpriority="high"' : ''} decoding="async" /></a>
    <div class="shop-product-copy">
    ${product.price === null ? '' : `<p class="shop-price">${escapeHtml(new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(product.price / 100))}</p>`}
    ${product.colors ? `<p>${product.colors} colors</p>` : ''}
    <a class="v2-btn" href="${escapeHtml(product.url)}" aria-label="Choose options for ${escapeHtml(product.title)}">Choose Options</a></div>
  </article>`;
  }).join('');
  return `<div class="shop-catalog" aria-label="Team products">
    <p>${saved ? 'Showing our saved collection. Check Printify for current products, prices, and availability.' : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}</p>
    ${products.length ? `<div class="shop-product-grid">${cards}</div>` : '<p>New gear is on the way. Visit our store for the latest availability.</p>'}
    </div>`;
}
