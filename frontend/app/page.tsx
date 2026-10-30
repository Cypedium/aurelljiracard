'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasSession } from "./utils/session";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (hasSession()) {
      router.replace("/cards");
    } else {
      router.replace("/login");
    }
  }, []);

  return null; // visar inget
}