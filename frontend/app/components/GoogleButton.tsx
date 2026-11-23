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
import { useLanguage } from '../hooks/useLanguage';
import { t as translateNow } from '../utils/languageStore';

type Props = {
  // Google's ID token; sent to the backend (/auth/google or /user/google)
  onCredential: (credential: string) => void;
  text?: GoogleButtonText;
};

// Google's own button (drawn by their script). Without NEXT_PUBLIC_GOOGLE_CLIENT_ID nothing is shown
export default function GoogleButton({ onCredential, text = 'signin_with' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Google draws its own text: in the UI's language, redrawn when it changes
  const { language } = useLanguage();
  // The latest callback, without redrawing the button on every render
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
        container.replaceChildren();
        google.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          width: googleButtonWidth(container.offsetWidth),
          locale: language,
        });
      })
      .catch((err: unknown) => {
        logError('Google sign-in script', err);
        toast.error(translateNow('Could not load Google sign-in.'), { id: GOOGLE_LOAD_ERROR_TOAST_ID });
      });
    return () => {
      cancelled = true;
    };
  }, [text, language]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={containerRef} className="flex min-h-10 w-full justify-center" />;
}
