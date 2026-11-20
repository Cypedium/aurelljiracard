import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind classes; later classes win on conflict (used by components/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
