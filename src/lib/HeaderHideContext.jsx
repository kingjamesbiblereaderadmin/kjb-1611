import React, { createContext, useState, useContext } from 'react';

const HeaderHideContext = createContext();

export function HeaderHideProvider({ children }) {
  const [hideHeader, setHideHeader] = useState(false);

  return (
    <HeaderHideContext.Provider value={{ hideHeader, setHideHeader }}>
      {children}
    </HeaderHideContext.Provider>
  );
}

export function useHeaderHide() {
  const context = useContext(HeaderHideContext);
  if (!context) {
    throw new Error('useHeaderHide must be used within HeaderHideProvider');
  }
  return context;
}