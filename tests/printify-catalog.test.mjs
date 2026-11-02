import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalog,fetchCatalog,normalizeProduct,renderCatalog} from '../app/lib/printify-catalog.mjs';

const product = {id:1,title:'Team "Tee"',image:'https://images-api.printify.com/mockup/example.jpg',defaultVariant:{retailPrice:1882},options:[]};
const wrap = data => '<script>self.__next_f.push('+JSON.stringify([1,JSON.stringify({products:data})])+')</script>';

test('reads escaped catalog data and rejects missing or incomplete data', () => {
  assert.equal(parseCatalog(wrap({products:[product],pagination:{page:1,pageCount:1,total:1}})).products[0].title,product.title);
  assert.throws(()=>parseCatalog('<html>Service unavailable</html>'));
  assert.throws(()=>parseCatalog(wrap({products:[product],pagination:{}})));
});

test('loads every page and rejects incomplete catalog syncs', async () => {
  const urls=[];
  const products=await fetchCatalog(async url=>{
    urls.push(url);
    const page=urls.length;
    return {ok:true,json:async()=>({data:[{...product,id:page}],current_page:page,last_page:2,total:2})};
  });
  assert.equal(products.length,2);
  assert.equal(new URL(urls[1]).searchParams.get('page'), '2');
  await assert.rejects(fetchCatalog(async()=>({ok:true,json:async()=>({data:[product],current_page:1,last_page:1,total:2})})),/Incomplete/);
  await assert.rejects(fetchCatalog(async()=>({ok:true,json:async()=>({data:[product],current_page:1,last_page:2,total:2})})),/pagination/);
});

test('escapes external titles, validates images, and displays prices without a prefix', () => {
  const normalized=normalizeProduct({...product,title:'<script>test</script>'});
  assert.throws(()=>normalizeProduct({...product,image:'javascript:alert(1)'}));
  const html=renderCatalog([normalized]);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>test'));
  assert.ok(html.includes('class="shop-price">$18.82'));
  assert.ok(!html.includes('From $'));
  assert.ok(renderCatalog([normalized],true).includes('class="shop-price">$18.82'));
  assert.equal(normalizeProduct({...product,defaultVariant:undefined,default_variant:{retail_price:3128}}).price,3128);
});

test('syncs custom storefront images alongside mockups without dropping the catalog', async () => {
  const custom = {...product, id:33859205, image:'https://d123s6f1z9g2wk.cloudfront.net/files/2026/11/hoodie.png?revision=123'};
  const items = await fetchCatalog(async () => ({ok:true,json:async()=>({data:[custom,product],current_page:1,last_page:1,total:2})}));
  assert.equal(items.length,2);
  assert.equal(items[0].image,custom.image);
  assert.ok(renderCatalog(items).includes(custom.image));
  for (const image of ['https://untrusted.example/image.png', 'https://other.cloudfront.net/image.png', 'http://d123s6f1z9g2wk.cloudfront.net/image.png', 'https://user:password@images-api.printify.com/image.png']) {
    assert.throws(() => normalizeProduct({...product,image}), /Unexpected product image/);
  }
});

test('groups every product once with category filters and keeps long sleeves separate from tees', async () => {
  const { productCategory } = await import('../app/lib/printify-catalog.mjs');
  const items = ['Graphic T‑Shirt', 'Long Sleeve Tee', 'Graphic Hoodie', 'Mesh-Back Cap', 'Team Mug']
    .map((title, index) => normalizeProduct({ ...product, id: index + 1, title }));
  assert.deepEqual(items.map(productCategory), ['t-shirts', 'long-sleeves', 'hoodies', 'hats', 'more-gear']);
  const html = renderCatalog(items);
  assert.equal((html.match(/class="shop-card"/g) || []).length, items.length);
  for (const item of items) {
    const id = productCategory(item);
    assert.ok(html.includes(`data-filter="${id}"`));
    assert.ok(html.includes(`data-category="${id}"`));
  }
  assert.ok(!renderCatalog([items[0]]).includes('data-filter="hats"'));
  assert.ok(html.includes('data-filter="all" aria-pressed="true"'));
});
