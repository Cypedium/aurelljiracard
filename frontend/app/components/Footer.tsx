import React from "react";

// Samma stil som navbaren: ingen ljus ram, vit text. Höjden (60px) räknas med i sidornas min-h
export default function Footer() {
  return (
    <footer className="flex h-[60px] w-full items-center justify-center bg-gray-600 font-brand text-white">
      <div>&copy; Mikael Aurell 2026</div>
    </footer>
  );
}
