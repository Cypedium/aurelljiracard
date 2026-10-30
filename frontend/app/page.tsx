'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "./utils/constants";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);

    if (token) {
      router.replace("/cards");
    } else {
      router.replace("/login");
    }
  }, []);

  return null; // visar inget
}