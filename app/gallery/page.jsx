import LegacyPage from '../components/LegacyPage';

export const metadata = {
  title: 'Gallery | Timpanogos Baseball'
};

export default async function GalleryPage() {
  return <LegacyPage sections={['v2Filmstrip']} />;
}
