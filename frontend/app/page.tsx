'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasSession } from "./utils/session";
import { ROUTES } from "./utils/routes";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (hasSession()) {
      router.replace(ROUTES.board);
    } else {
      router.replace(ROUTES.login);
    }
  }, []);

  return null; // visar inget
}