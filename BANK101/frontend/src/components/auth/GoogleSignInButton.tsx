import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../../lib/api';

/**
 * Real Google sign-in (Google Identity Services). The browser gets a signed ID token (the "credential") from Google
 * and we send ONLY that token to the server, which verifies it with Google. The old button invented a random e-mail
 * and id, which is why it could never be a real login.
 *
 * Shown only when VITE_GOOGLE_CLIENT_ID is set. Otherwise it says honestly that Google sign-in is not configured.
 */
declare global {
  interface Window {
    google?: any;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Could not load Google sign-in')));
    if (!existing) {
      script.src = GSI_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export default function GoogleSignInButton({ onCredential, disabled }: { onCredential: (idToken: string) => void; disabled?: boolean }) {
  const holder = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: { credential?: string }) => {
            if (resp?.credential) onCredential(resp.credential);
          },
        });
        window.google.accounts.id.renderButton(holder.current, { theme: 'filled_black', size: 'large', text: 'continue_with', width: 320 });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (!GOOGLE_CLIENT_ID || failed) {
    return (
      <div
        role="note"
        className="w-full border border-dashed border-slate-700 text-slate-500 font-semibold text-[11px] py-3 rounded-xl text-center select-none"
      >
        {failed ? 'Google sign-in could not be loaded (offline?)' : 'Google sign-in is not configured on this server'}
      </div>
    );
  }
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div ref={holder} className="flex justify-center" />
    </div>
  );
}
