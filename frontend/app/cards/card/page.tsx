'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import { hasSession } from "../../utils/session";

export default function CardPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!hasSession()) {
      router.replace("/"); // root tar hand om redirect till login
    } else {
      setAllowed(true); // visa formuläret
    }
  }, []);

  if (!allowed) return null; // visa inget innan redirect/allow

  // Samma bakgrund som boarden; pt eftersom navbaren är fixed
  return (
    <div className="min-h-screen bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-20 pb-6">
      <Card />
    </div>
  );
}