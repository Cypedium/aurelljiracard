import React from "react";

// Ingen ljus ram. Höjden (60px) räknas med i sidornas min-h. shrink-0: body är en flex-kolumn med
// skärmens höjd, så en lång board krympte annars footern till textens höjd
export default function Footer() {
  return (
    <footer className="flex h-[60px] w-full shrink-0 items-center justify-center bg-gray-600 font-brand">
      <div>&copy; Mikael Aurell 2026</div>
    </footer>
  );
}
