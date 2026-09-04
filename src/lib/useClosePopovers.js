import { useEffect } from 'react';

// Listens for the global 'kjb-close-popovers' event (dispatched by header
// buttons like refresh/theme/menu) and runs the provided close callback so
// the reader's open popovers dismiss when a header button is tapped.
export function useClosePopovers(closeAll) {
  useEffect(() => {
    window.addEventListener('kjb-close-popovers', closeAll);
    return () => window.removeEventListener('kjb-close-popovers', closeAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}