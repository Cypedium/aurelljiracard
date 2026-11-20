"use client";

import { useLayoutEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Toaster } from "./components/ui/sonner";
import { applyAppearance, loadAppearance } from "./utils/appearanceStore";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // The saved appearance (the board's background, the navbar's colour) before the browser's first paint
  useLayoutEffect(() => applyAppearance(loadAppearance()), []);

  return (
    <>
      <Navbar />
      {/* The board's background on every page (not the navbar/footer). No min-h here: main fills the screen with flex: 1
          (root.css) and must be able to grow with the content, otherwise the footer ends up in the middle of a long board */}
      <main className="bg-linear-135 from-board-from via-board-via to-board-to">{children}</main>
      <Footer />
      {/* richColors: red errors, green successes; closeButton to close at once */}
      <Toaster richColors closeButton />
    </>
  );
}