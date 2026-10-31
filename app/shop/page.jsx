import LegacyPage from '../components/LegacyPage';
import savedCatalog from '../data/printify-catalog.json';
import { fetchCatalog, renderCatalog } from '../lib/printify-catalog.mjs';

export const metadata = {
  title: 'Team Shop | Timpanogos Baseball',
  description: 'Shop Timpanogos Timberwolves baseball tees, hoodies, and fan gear. Choose your size and color and purchase through our Printify store.',
  alternates: { canonical: 'https://timpanogosbaseball.com/shop/' },
  openGraph: {
    title: 'Team Shop | Timpanogos Baseball',
    description: 'Timberwolves tees, hoodies, and fan gear for players, families, and fans.',
    url: 'https://timpanogosbaseball.com/shop/',
    type: 'website'
  }
};

export const revalidate = 60;

export default async function ShopPage() {
  let products = savedCatalog;
  let saved = true;
  try {
    products = await fetchCatalog();
    saved = false;
  } catch (error) {
    console.warn('Using saved Printify catalog:', error.message);
  }
  return <LegacyPage sections={['shop']} catalogHtml={renderCatalog(products, saved)} />;
}
