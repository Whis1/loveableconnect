import { NICKNAME_TAKEN_MESSAGE } from "@/lib/nickname";
import { useNicknameAvailability } from "@/hooks/useNicknameAvailability";

interface NicknameAvailabilityMessageProps {
  nickname: string;
  currentProfileId?: string;
  className?: string;
}

export const NicknameAvailabilityMessage = ({
  nickname,
  currentProfileId,
  className = "",
}: NicknameAvailabilityMessageProps) => {
  const { isTaken } = useNicknameAvailability(nickname, currentProfileId);

  if (!isTaken) return null;

  return (
    <p className={`text-xs font-semibold text-red-500 dark:text-red-400 ${className}`}>
      {NICKNAME_TAKEN_MESSAGE}
    </p>
  );
};
