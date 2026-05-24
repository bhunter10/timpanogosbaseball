import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Info | Timpanogos Baseball'
};

export default async function InfoPage() {
  return <LegacyPage sections={['info', 'v2CountdownSection']} />;
}
