"use client";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {/* Boardens bakgrund på alla sidor (inte navbar/footer). Ingen min-h här: main fyller skärmen med flex: 1
          (root.css) och måste få växa med innehållet, annars hamnar footern mitt i en lång board */}
      <main className="bg-linear-135 from-board-from via-board-via to-board-to">{children}</main>
      <Footer />
      {/* richColors: röda fel, gröna lyckade; closeButton för att stänga direkt */}
      <Toaster richColors closeButton />
    </>
  );
}