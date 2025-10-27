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
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        isOnline ? "bg-green-500" : "bg-muted-foreground/30",
        className
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
};

export default OnlineIndicator;
