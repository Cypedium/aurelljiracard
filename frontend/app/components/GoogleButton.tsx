'use client';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { logError } from '../utils/apiError';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_LOAD_ERROR_TOAST_ID,
  googleButtonWidth,
  loadGoogleIdentity,
  type GoogleButtonText,
} from '../utils/google';

type Props = {
  // Googles ID-token; skickas till backend (/auth/google eller /user/google)
  onCredential: (credential: string) => void;
  text?: GoogleButtonText;
};

// Googles egen knapp (ritas av deras skript). Utan NEXT_PUBLIC_GOOGLE_CLIENT_ID visas ingenting
export default function GoogleButton({ onCredential, text = 'signin_with' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Senaste callbacken utan att knappen ritas om vid varje render
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        google.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width: googleButtonWidth(container.offsetWidth),
        });
      })
      .catch((err: unknown) => {
        logError('Google sign-in script', err);
        toast.error('Could not load Google sign-in.', { id: GOOGLE_LOAD_ERROR_TOAST_ID });
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={containerRef} className="flex min-h-10 w-full justify-center" />;
}
