import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGenericLocationPhrase(t: any): string {
  const phrases = [
    t("common.nearbyUser1"),
    t("common.nearbyUser2"),
    t("common.nearbyUser3"),
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
