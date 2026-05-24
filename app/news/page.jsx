import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'News | Timpanogos Baseball'
};

export default async function NewsPage() {
  return <LegacyPage sections={['news']} />;
}
