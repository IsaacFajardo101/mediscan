import React, { createContext, useContext, useState } from 'react';

type Ctx = {
  onFilterPress: (() => void) | null;
  setOnFilterPress: (fn: (() => void) | null) => void;
};

const HeaderFilterContext = createContext<Ctx>({
  onFilterPress: null,
  setOnFilterPress: () => {},
});

export function HeaderFilterProvider({ children }: { children: React.ReactNode }) {
  const [onFilterPress, setHandler] = useState<(() => void) | null>(null);
  // wrapped in () => so React stores the function instead of calling it
  const setOnFilterPress = (fn: (() => void) | null) => setHandler(() => fn);
  return (
    <HeaderFilterContext.Provider value={{ onFilterPress, setOnFilterPress }}>
      {children}
    </HeaderFilterContext.Provider>
  );
}

export const useHeaderFilter = () => useContext(HeaderFilterContext);