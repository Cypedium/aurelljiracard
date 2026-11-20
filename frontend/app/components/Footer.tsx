import React from "react";

// No light border. The height (60px) is included in the pages' min-h. shrink-0: body is a flex column with
// the screen's height, so a long board used to shrink the footer to the height of its text
export default function Footer() {
  return (
    <footer className="flex h-60px w-full shrink-0 items-center justify-center bg-gray-600 font-brand text-stone-400">
      <div>© Mikael Aurell 2026</div>
    </footer>
  );
}
