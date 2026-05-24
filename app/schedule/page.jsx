import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Schedule | Timpanogos Baseball'
};

export default async function SchedulePage() {
  return <LegacyPage sections={['info', 'v2CountdownSection', 'schedule']} />;
}
