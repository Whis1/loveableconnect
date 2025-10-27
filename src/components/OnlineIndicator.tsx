import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  userId: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const OnlineIndicator = ({ userId, className, size = "md" }: OnlineIndicatorProps) => {
  const { isOnline, showStatus } = useOnlineStatus(userId);

  // Don't show anything if user has disabled status visibility
  if (!showStatus) return null;

  const sizeClasses = {
    sm: "h-2.5 w-2.5",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        size === "sm" ? "p-0.5" : size === "md" ? "p-1" : "p-1",
        "bg-background shadow-lg",
        className
      )}
    >
      <span
        className={cn(
          "rounded-full block transition-all duration-300",
          sizeClasses[size],
          isOnline 
            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" 
            : "bg-gray-400 dark:bg-gray-600",
        )}
        aria-label={isOnline ? "Online" : "Offline"}
      />
    </div>
  );
};

export default OnlineIndicator;
