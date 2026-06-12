import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { apiClient } from '../lib/api';

type Provider = { id: string; label: string };

// Per-provider brand styling + icon. Anything not listed still renders with a
// neutral fallback, so adding a backend provider needs no frontend change.
const BRAND: Record<string, { className: string; icon: ReactElement }> = {
  github: {
    className: 'bg-[#24292f] hover:bg-[#1b1f23] text-white',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.41 7.86 10.94.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" />
      </svg>
    ),
  },
  discord: {
    className: 'bg-[#5865F2] hover:bg-[#4752c4] text-white',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M20.32 4.37A19.8 19.8 0 0 0 15.45 2.9a.07.07 0 0 0-.08.04c-.21.38-.45.87-.61 1.25a18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.62-1.25.07.07 0 0 0-.08-.04A19.74 19.74 0 0 0 3.7 4.37a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.29 1.23-1.99a.08.08 0 0 0-.04-.11c-.65-.25-1.27-.55-1.87-.89a.08.08 0 0 1-.01-.13c.13-.1.25-.2.37-.3a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.1.24.2.37.3a.08.08 0 0 1-.01.13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.78 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.56-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
      </svg>
    ),
  },
};

const FALLBACK = {
  className: 'bg-social-forest-600 hover:bg-social-forest-700 text-white',
  icon: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
    </svg>
  ),
};

export function OAuthButtons() {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    let active = true;
    apiClient
      .get<{ data: Provider[] }>('/auth/oauth/providers')
      .then((res) => {
        if (active) setProviders(res.data || []);
      })
      .catch(() => {
        // Endpoint missing or no providers configured — render nothing.
      });
    return () => {
      active = false;
    };
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="space-y-2">
      {providers.map((p) => {
        const brand = BRAND[p.id] ?? FALLBACK;
        return (
          <a
            key={p.id}
            href={`/api/auth/oauth/${p.id}/start`}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold transition-colors ${brand.className}`}
          >
            {brand.icon}
            <span>Continue with {p.label}</span>
          </a>
        );
      })}
    </div>
  );
}
