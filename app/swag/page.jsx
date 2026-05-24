import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Swag | Timpanogos Baseball'
};

export default async function SwagPage() {
  return <LegacyPage sections={['swag']} />;
}
