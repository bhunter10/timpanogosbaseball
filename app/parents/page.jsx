import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Parents | Timpanogos Baseball',
  description: 'Sponsor banners and banquet committees for Timpanogos Baseball parents.'
};

export default async function ParentsPage() {
  return <LegacyPage sections={['parents']} />;
}
