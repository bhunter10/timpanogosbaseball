import LegacyPage from './components/LegacyPage';

export default async function HomePage() {
  return <LegacyPage sections={['hero', 'identity-rail', 'culture', 'strengths', 'coaching', 'program']} />;
}
