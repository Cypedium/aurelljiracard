import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Slår ihop Tailwind-klasser; senare klasser vinner vid konflikt (används av components/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
