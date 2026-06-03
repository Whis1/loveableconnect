import { Crown } from "lucide-react";

// 👑 Badge "Premium" mostrato sui profili degli abbonati.
export const PremiumBadge = ({ className = "" }: { className?: string }) => (
  <div
    className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-lg ring-1 ring-amber-200/70 ${className}`}
  >
    <Crown className="h-3.5 w-3.5" />
    Premium
  </div>
);
