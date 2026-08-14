'use client';

import { useEffect, useRef } from 'react';
import { Menu, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileNavigationOverlayProps {
  isOpen: boolean;
  activeMode: 'navigation' | 'character' | 'closed';
  onClose: () => void;
  onSwitchMode: (mode: 'navigation' | 'character') => void;
}

export function MobileNavigationOverlay({
  isOpen,
  activeMode,
  onClose,
  onSwitchMode,
}: MobileNavigationOverlayProps) {
  const opener = useRef<HTMLButtonElement>(null);
  const chrome = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    if (desktop.matches) {
      onClose();
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const panelId = activeMode === 'navigation' ? 'mobile-forge-navigation-panel' : 'mobile-forge-character-panel';
    const panel = document.getElementById(panelId);
    const background = Array.from(document.querySelectorAll<HTMLElement>('[data-forge-modal-background]'));
    background.forEach((element) => { element.inert = true; });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = [chrome.current, panel].flatMap((root) => root ? Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')) : []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    desktop.addEventListener('change', closeOnDesktop);
    window.requestAnimationFrame(() => chrome.current?.querySelector<HTMLElement>('button')?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => { element.inert = false; });
      window.removeEventListener('keydown', closeOnEscape);
      desktop.removeEventListener('change', closeOnDesktop);
      opener.current?.focus();
    };
  }, [activeMode, isOpen, onClose]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30 lg:hidden">
        <Button
          ref={opener}
          size="icon"
          variant="default"
          onClick={() => onSwitchMode('navigation')}
          className="rounded-full shadow-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {isOpen && (
        <div
          ref={chrome}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-forge-dialog-title"
          aria-owns={activeMode === 'navigation' ? 'mobile-forge-navigation-panel' : 'mobile-forge-character-panel'}
          aria-label={activeMode === 'navigation' ? 'Creation navigation' : 'Character summary'}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-3">
            <div id="mobile-forge-dialog-title" className="font-semibold">
              {activeMode === 'navigation' ? 'Creation Steps' : 'Character Summary'}
            </div>
            <div className="flex gap-2">
              {activeMode === 'navigation' && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSwitchMode('character')}
                  aria-label="Open character summary"
                >
                  <UserRound className="h-5 w-5" />
                </Button>
              )}
              {activeMode === 'character' && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSwitchMode('navigation')}
                  aria-label="Switch to navigation"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1" aria-hidden="true" />
        </div>
      )}
    </>
  );
}
