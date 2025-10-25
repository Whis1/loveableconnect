import { memo } from 'react';
import { ProfileGridCard } from './ProfileGridCard';

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

interface ProfileGridCardMemoProps {
  profile: Profile;
  currentUserId: string;
  onLike: (profileId: string) => void;
  onMatch?: (profileName: string) => void;
}

// Memoized version of ProfileGridCard for better performance
export const ProfileGridCardMemo = memo(
  ({ profile, currentUserId, onLike, onMatch }: ProfileGridCardMemoProps) => {
    return (
      <ProfileGridCard
        profile={profile}
        currentUserId={currentUserId}
        onLike={onLike}
        onMatch={onMatch}
      />
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.profile.id === nextProps.profile.id &&
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.profile.bio === nextProps.profile.bio &&
      prevProps.profile.avatar_url === nextProps.profile.avatar_url
    );
  }
);

ProfileGridCardMemo.displayName = 'ProfileGridCardMemo';
