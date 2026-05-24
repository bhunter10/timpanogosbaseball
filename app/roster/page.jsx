import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Roster | Timpanogos Baseball'
};

export default async function RosterPage() {
  return <LegacyPage sections={['roster']} />;
}
