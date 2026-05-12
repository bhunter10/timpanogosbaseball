export function withBasePath(value) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (!basePath || !value || value.charAt(0) !== '/') return value;
  return basePath + value;
}
