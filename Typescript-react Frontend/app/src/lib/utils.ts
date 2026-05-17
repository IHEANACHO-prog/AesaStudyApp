import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility to merge Tailwind classes efficiently.
 * Combines 'clsx' for conditional logic and 'twMerge' 
 * to resolve Tailwind utility conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}