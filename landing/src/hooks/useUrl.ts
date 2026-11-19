import { usePathname } from 'next/navigation';

export function useUrl() {
  const pathname = usePathname();
  const currentPage = pathname.split('/')[2];

  return { currentPage };
}
