"use client";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {/* Boardens bakgrund på alla sidor (inte navbar/footer); 60px = footerns höjd */}
      <main className="min-h-[calc(100dvh-60px)] bg-linear-135 from-board-from via-board-via to-board-to">{children}</main>
      <Footer />
      {/* richColors: röda fel, gröna lyckade; closeButton för att stänga direkt */}
      <Toaster richColors closeButton />
    </>
  );
}