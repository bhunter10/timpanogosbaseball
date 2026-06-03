import AdminPage, { metadata } from '../page';

export { metadata };

export function generateStaticParams() {
  return [
    { section: 'saved-games' },
    { section: 'opponents' },
    { section: 'gallery' },
    { section: 'training' },
    { section: 'news' }
  ];
}

export default AdminPage;
