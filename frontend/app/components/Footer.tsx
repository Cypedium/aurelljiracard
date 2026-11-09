import React from "react";

// Ingen ljus ram. Höjden (60px) räknas med i sidornas min-h
export default function Footer() {
  return (
    <footer className="flex h-[60px] w-full items-center justify-center bg-gray-600 font-brand">
      <div>&copy; Mikael Aurell 2026</div>
    </footer>
  );
}
