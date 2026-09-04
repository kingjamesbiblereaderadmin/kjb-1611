import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const SoftReloadContext = createContext({ reloadKey: 0, softReload: () => {} });

export function SoftReloadProvider({ children }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [isReloading, setIsReloading] = useState(false);

  const softReload = useCallback((message = 'Refreshing…') => {
    setIsReloading(true);
    // Remount the page content (header/footer stay mounted)
    setTimeout(() => {
      setReloadKey(k => k + 1);
      setIsReloading(false);
    }, 400);
  }, []);

  // Service worker updates are now handled globally in App.jsx via the splash screen

  return (
    <SoftReloadContext.Provider value={{ reloadKey, softReload, isReloading }}>
      {children}
    </SoftReloadContext.Provider>
  );
}

export const useSoftReload = () => useContext(SoftReloadContext);