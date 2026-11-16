'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SITE_CONTENT, mergeSiteContent, type SiteContent } from '@/lib/site-content';

const CACHE_KEY = 'mylkio_site_content_v1';
export const SITE_CONTENT_CHANGED = 'mylkio_site_content_changed';

const SiteContentContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT);

/**
 * Gives every screen the website's editable content (contact details, plan prices, testimonials, FAQ).
 * It starts with the built-in wording, so the first paint never waits; the last copy this phone saw is used
 * next (so it still works offline), and then the current copy is fetched. A failed fetch changes nothing.
 */
export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setContent(mergeSiteContent(JSON.parse(cached)));
    } catch { /* No saved copy, or storage is blocked: the built-in wording stays. */ }

    const load = async () => {
      try {
        const response = await fetch('/api/site-content', { cache: 'no-store' });
        if (!response.ok) return;
        const fresh = await response.json();
        if (cancelled) return;
        setContent(mergeSiteContent(fresh));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch { /* Not essential. */ }
      } catch { /* Offline or the server is busy: keep what is showing. */ }
    };
    void load();
    // The administrator's own screen asks for a refresh right after saving, so they see the change at once.
    const reload = () => { void load(); };
    window.addEventListener(SITE_CONTENT_CHANGED, reload);
    return () => { cancelled = true; window.removeEventListener(SITE_CONTENT_CHANGED, reload); };
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export const useSiteContent = () => useContext(SiteContentContext);
