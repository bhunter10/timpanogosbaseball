export const STORE_URL = 'https://timpanogos-baseball.printify.me';

// Printify mockups and custom storefront uploads use different image hosts.
const imageHosts = new Set(['images-api.printify.com', 'd123s6f1z9g2wk.cloudfront.net']);

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
  if (image.protocol !== 'https:' || !imageHosts.has(image.hostname) || image.username || image.password) throw new Error('Unexpected product image');
  const price = product.defaultVariant?.retailPrice ?? product.default_variant?.retail_price;
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
    // The storefront HTML always embeds page 1, regardless of its query string.
    // Use the same public catalog endpoint as Printify's browser pagination.
    const response = await fetcher(`https://api.printify.me/api/timpanogos-baseball/product?take=24&sort=manual&page=${page}`, {
      next: { revalidate: 60 }, signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Printify returned ${response.status}`);
    const data = await response.json();
    const catalog = {
      products: data.data,
      pagination: { page: data.current_page, pageCount: data.last_page, total: data.total }
    };
    pageCount = catalog.pagination.pageCount;
    if (!Array.isArray(catalog.products) || !Number.isInteger(pageCount) || pageCount < 0 || pageCount > 100 || catalog.pagination.page !== page || !Number.isInteger(data.total) || data.total < 0) throw new Error('Invalid catalog pagination');
    expectedTotal = catalog.pagination.total;
    for (const product of catalog.products) products.set(product.id, normalizeProduct(product));
  }
  if (products.size !== expectedTotal) throw new Error('Incomplete catalog sync');
  return [...products.values()];
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function productCategory(product) {
  const title = product.title;
  if (/long[\s-]*sleeve/i.test(title)) return 'long-sleeves';
  if (/hoodie|hooded|sweatshirt/i.test(title)) return 'hoodies';
  if (/\b(hat|cap|snapback|beanie)\b/i.test(title)) return 'hats';
  if (/t[\s\-‑–]*shirt|\btee\b|\bshirt\b/i.test(title)) return 't-shirts';
  return 'more-gear';
}

export function renderCatalog(products, saved = false) {
  // Keep Team Nelson last while preserving the storefront order for other gear.
  const orderedProducts = products.filter(item => item.id !== 33793727)
    .concat(products.filter(item => item.id === 33793727));
  const categories = [
    ['t-shirts', 'T-Shirts'],
    ['long-sleeves', 'Long-Sleeve Shirts'],
    ['hoodies', 'Hoodies & Sweatshirts'],
    ['hats', 'Hats'],
    ['more-gear', 'More Gear']
  ].map(([id, label]) => ({ id, label, products: orderedProducts.filter(item => productCategory(item) === id) }))
    .filter(category => category.products.length);
  const renderCard = (item, index) => {
    const product = { ...item, ...displayOverrides[item.id] };
    return `<article class="shop-card" data-category="${productCategory(item)}">
    <a class="shop-product-image" href="${escapeHtml(product.url)}"><img src="${escapeHtml(product.image.startsWith('/') ? (process.env.NEXT_PUBLIC_BASE_PATH || '') + product.image : product.image)}" alt="${escapeHtml(product.imageAlt || product.title)}" width="640" height="640" loading="${index === 0 ? 'eager' : 'lazy'}" ${index === 0 ? 'fetchpriority="high"' : ''} decoding="async" /></a>
    <div class="shop-product-copy">
    ${product.price === null ? '' : `<p class="shop-price">${escapeHtml(new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(product.price / 100))}</p>`}
    ${product.colors ? `<p>${product.colors} colors</p>` : ''}
    <a class="v2-btn" href="${escapeHtml(product.url)}" aria-label="Choose options for ${escapeHtml(product.title)}">Choose Options</a></div>
  </article>`;
  };
  return `<div class="shop-catalog" aria-label="Team products">
    ${products.length ? `<div class="shop-categories" role="group" aria-label="Filter products by category" hidden>
      <button type="button" data-filter="all" aria-pressed="true" aria-controls="shop-products">All Products</button>
      ${categories.map(category => `<button type="button" data-filter="${category.id}" aria-pressed="false" aria-controls="shop-products">${category.label}</button>`).join('')}
    </div>
    <p class="shop-filter-status" role="status" aria-live="polite"></p>
    <div class="shop-product-grid" id="shop-products">${orderedProducts.map(renderCard).join('')}</div>` : '<p>New gear is on the way. Visit our store for the latest availability.</p>'}
    </div>`;
}
