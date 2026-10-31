import React, { createContext, useContext, useState } from 'react';

// ito yung '+' button and the burger menu. it also controls yung "Log out of MediScan?" popup.
export type Anchor = { x: number; y: number; w: number; h: number } | null;

type Ctx = {
  // burger side menu
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  // "+" Add Medicine popup
  addOpen: boolean;
  addAnchor: Anchor;
  openAdd: (anchor?: Anchor) => void;
  closeAdd: () => void;
  // "Log out of MediScan?" popup
  logoutOpen: boolean;
  openLogout: () => void;
  closeLogout: () => void;
};

const noop = () => {};
const MenuCtx = createContext<Ctx>({
  open: false, openMenu: noop, closeMenu: noop,
  addOpen: false, addAnchor: null, openAdd: noop, closeAdd: noop,
  logoutOpen: false, openLogout: noop, closeLogout: noop,
});

export const useMenu = () => useContext(MenuCtx);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addAnchor, setAddAnchor] = useState<Anchor>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  return (
    <MenuCtx.Provider
      value={{
        open,
        openMenu: () => setOpen(true),
        closeMenu: () => setOpen(false),
        addOpen,
        addAnchor,
        openAdd: (anchor = null) => {
          setAddAnchor(anchor);
          setAddOpen(true);
        },
        closeAdd: () => setAddOpen(false),
        logoutOpen,
        openLogout: () => setLogoutOpen(true),
        closeLogout: () => setLogoutOpen(false),
      }}
    >
      {children}
    </MenuCtx.Provider>
  );
}