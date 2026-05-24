import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Records | Timpanogos Baseball'
};

export default async function RecordsPage() {
  return <LegacyPage sections={['records']} />;
}
