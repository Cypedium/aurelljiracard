'use client';
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasSession } from "../utils/session";
import { ROUTES } from "../utils/routes";
import { useLanguage } from "../hooks/useLanguage";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const checkAuth = () => {
      // No token at all → the user is not logged in
      if (!hasSession()) {
        router.replace(ROUTES.login);
        setIsAuthenticated(false);
        return;
      }

      // At least one token exists → let the axios interceptor decide the rest
      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return <div className="py-10 pt-24 text-center font-jira text-white">{t("Loading…")}</div>;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}