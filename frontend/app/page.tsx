'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      router.replace("/cards");
    } else {
      router.replace("/login");
    }
  }, []);

  return null; // visar inget
}