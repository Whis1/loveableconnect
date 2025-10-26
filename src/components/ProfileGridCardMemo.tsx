import { memo } from "react";
import { ProfileGridCard } from "./ProfileGridCard";

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  looking_for: string[] | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  distance?: number;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
}

interface ProfileGridCardProps {
  profile: Profile;
  currentUserId: string;
  onLike: (profileId: string) => void;
  onMatch?: (profileName: string) => void;
}

export const ProfileGridCardMemo = memo(ProfileGridCard, (prevProps, nextProps) => {
  // Only re-render if profile id changes or currentUserId changes
  return prevProps.profile.id === nextProps.profile.id &&
         prevProps.currentUserId === nextProps.currentUserId;
});
