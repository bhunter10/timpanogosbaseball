import AdminPage, { metadata } from '../../page';

export { metadata };

export function generateStaticParams() {
  return [
    { trainingSection: 'trainers' },
    { trainingSection: 'availability' },
    { trainingSection: 'requests' }
  ];
}

export default AdminPage;
