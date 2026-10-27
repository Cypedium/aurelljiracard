"use client";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/sonner";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      {/* richColors: röda fel, gröna lyckade; closeButton för att stänga direkt */}
      <Toaster richColors closeButton />
    </>
  );
}