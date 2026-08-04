import { useEffect, useState } from 'react';

// Hash routing, because GitHub Pages cannot rewrite unknown paths to
// index.html and a deep link to /barang would otherwise 404.

const read = () => window.location.hash.replace(/^#\/?/, '') || 'kasir';

export function useHashRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return [route, navigate];
}

export const navigate = (to) => {
  window.location.hash = `#/${to}`;
};
