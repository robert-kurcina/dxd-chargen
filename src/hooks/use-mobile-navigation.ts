import { useState, useCallback } from 'react';

export type MobileNavMode = 'navigation' | 'character' | 'closed';

export function useMobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<MobileNavMode>('navigation');

  const openNavigation = useCallback(() => {
    setIsOpen(true);
    setActiveMode('navigation');
  }, []);

  const openCharacterPanel = useCallback(() => {
    setIsOpen(true);
    setActiveMode('character');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveMode('closed');
  }, []);

  const switchMode = useCallback((mode: MobileNavMode) => {
    if (mode === 'closed') {
      setIsOpen(false);
      setActiveMode('closed');
    } else {
      setIsOpen(true);
      setActiveMode(mode);
    }
  }, []);

  return {
    isOpen,
    activeMode,
    openNavigation,
    openCharacterPanel,
    close,
    switchMode,
  };
}
