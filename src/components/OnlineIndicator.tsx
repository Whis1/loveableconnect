import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "rounded-full flex items-center justify-center cursor-pointer",
              size === "sm" ? "p-0.5" : size === "md" ? "p-0.5" : "p-1",
              "bg-background shadow-sm",
              className
            )}
          >
            <span
              className={cn(
                "rounded-full block transition-all duration-300",
                sizeClasses[size],
                isOnline 
                  ? "bg-green-500" 
                  : "bg-gray-400 dark:bg-gray-600",
              )}
              aria-label={isOnline ? "Online" : "Offline"}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOnline ? "Online" : "Offline"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OnlineIndicator;
