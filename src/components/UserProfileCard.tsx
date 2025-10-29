import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, MapPin, Heart, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import profileBackground from "@/assets/profile-background.png";
import { useAdminRole } from "@/hooks/useAdminRole";
import { SpotifySongCard } from "@/components/SpotifySongCard";
import { calculateAge } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  relationship_type: string | null;
  relationship_status: string | null;
  favorite_songs: any[] | null;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
}

interface UserProfileCardProps {
  userId: string;
}

export const UserProfileCard = ({ userId }: UserProfileCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [translatedBio, setTranslatedBio] = useState<string>('');
  const [translatedInterests, setTranslatedInterests] = useState<string[]>([]);
  const { translateText, translateArray } = useTextTranslation();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile({
          ...data,
          favorite_songs: data.favorite_songs as any[] | null
        });
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(data.avatar_url);
          setAvatarUrl(urlData.publicUrl);
        }
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`user-profile-card-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('Profile updated in UserProfileCard:', payload.new);
          const updatedProfile = {
            ...payload.new,
            favorite_songs: payload.new.favorite_songs as any[] | null
          } as Profile;
          setProfile(updatedProfile);
          
          // Update avatar URL if changed
          if (updatedProfile.avatar_url) {
            const { data: urlData } = supabase.storage
              .from('profile-images')
              .getPublicUrl(updatedProfile.avatar_url);
            setAvatarUrl(urlData.publicUrl);
          } else {
            setAvatarUrl(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const loadTranslations = async () => {
      // Use pre-translated data if available
      if (profile?.translatedBio) {
        setTranslatedBio(profile.translatedBio);
      } else if (profile?.bio) {
        const translated = await translateText(profile.bio);
        setTranslatedBio(translated);
      }
      
      if (profile?.translatedInterests) {
        setTranslatedInterests(profile.translatedInterests);
      } else if (profile?.interests) {
        const translated = await translateArray(profile.interests);
        setTranslatedInterests(translated);
      }
    };
    loadTranslations();
  }, [profile?.bio, profile?.interests, profile?.translatedBio, profile?.translatedInterests]);

  const getRelationshipTypeLabel = (type: string) => {
    const key = type.toLowerCase();
    const labels: Record<string, string> = {
      serious: t('profile.seriousRelationship'),
      'relazione seria': t('profile.seriousRelationship'),
      'serious relationship': t('profile.seriousRelationship'),
      casual: t('profile.casualDating'),
      'incontri casuali': t('profile.casualDating'),
      'casual dating': t('profile.casualDating'),
      friendship: t('profile.friendship'),
      amicizia: t('profile.friendship'),
      open: t('common.openRelationship'),
      'relazione aperta': t('common.openRelationship'),
      'open relationship': t('common.openRelationship'),
      'prefer-not-say': t('common.preferNotSay'),
      'prefer_not_say': t('common.preferNotSay'),
      'preferisco non dirlo': t('common.preferNotSay'),
      'preferisco_non_dirlo': t('common.preferNotSay'),
      'not-sure': t('common.notSure'),
      'not_sure': t('common.notSure'),
      'not sure': t('common.notSure'),
      'non specifico': t('common.notSure'),
    };
    return labels[key] || type;
  };

  const getRelationshipStatusLabel = (status: string) => {
    const key = status.toLowerCase();
    const labels: Record<string, string> = {
      single: t('common.single'),
      sposato: t('common.married'),
      sposata: t('common.married'),
      'sposato/a': t('common.married'),
      married: t('common.married'),
      divorced: t('common.divorced'),
      divorziato: t('common.divorced'),
      divorziata: t('common.divorced'),
      'divorziato/a': t('common.divorced'),
      widowed: t('common.widowed'),
      vedovo: t('common.widowed'),
      vedova: t('common.widowed'),
      'vedovo/a': t('common.widowed'),
      in_relationship: t('common.inRelationship'),
      fidanzato: t('common.inRelationship'),
      fidanzata: t('common.inRelationship'),
      'fidanzato/a': t('common.inRelationship'),
      'in una relazione': t('common.inRelationship'),
      prefer_not_say: t('common.preferNotSay'),
      preferisco_non_dirlo: t('common.preferNotSay'),
      'preferisco non dirlo': t('common.preferNotSay'),
      scoprilo: t('common.notSpecified'),
    };
    return labels[key] || status;
  };

  if (!profile) return null;

  const favoriteSongs = profile.favorite_songs 
    ? (typeof profile.favorite_songs === 'string' 
        ? JSON.parse(profile.favorite_songs) 
        : profile.favorite_songs)
    : [];

  return (
    <Card className="overflow-hidden relative">
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${profileBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3
        }}
      />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-lg">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-4xl">
              {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 w-full">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{profile.nickname}</h2>
              {profile.birthdate && (
                <p className="text-sm text-muted-foreground">
                  {calculateAge(profile.birthdate)} {t("userProfile.years")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {(!adminLoading && isAdmin) || (currentUserId === profile.id) 
                  ? (profile.city || t("common.nearbyLocation")) 
                  : t("common.nearbyLocation")}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center items-center w-full">
              {profile.gender && (
                <Badge variant="outline" className="text-xs">
                  {profile.gender === 'male' ? t("common.male") :
                   profile.gender === 'female' ? t("common.female") :
                   profile.gender}
                </Badge>
              )}
              
              {profile.sexual_orientation && (
                <Badge variant="outline" className="text-xs">
                  {profile.sexual_orientation === 'heterosexual' ? t("common.heterosexual") :
                   profile.sexual_orientation === 'homosexual' ? t("common.homosexual") :
                   profile.sexual_orientation === 'bisexual' ? t("common.bisexual") :
                   profile.sexual_orientation === 'pansexual' ? t("common.pansexual") :
                   profile.sexual_orientation === 'asexual' ? t("common.asexual") :
                   profile.sexual_orientation === 'other' ? t("common.other") :
                   profile.sexual_orientation}
                </Badge>
              )}
              
              {profile.relationship_status && (
                <Badge variant="outline" className="text-xs">
                  {getRelationshipStatusLabel(profile.relationship_status)}
                </Badge>
              )}
              
              {profile.relationship_type && (
                <Badge variant="secondary" className="text-xs">
                  {getRelationshipTypeLabel(profile.relationship_type)}
                </Badge>
              )}
            </div>
          </div>

          {profile.interests && profile.interests.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-sm font-semibold">{t("userProfile.interests")}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {(translatedInterests.length > 0 ? translatedInterests : profile.interests).map((interest, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {favoriteSongs && favoriteSongs.length > 0 && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{t("profile.favoriteSongs")}</p>
              </div>
              <div className="w-full overflow-x-auto">
                <div className="flex gap-3 pb-2 px-1 min-w-max">
                  {favoriteSongs.map((song: any, index: number) => (
                    <SpotifySongCard
                      key={index}
                      song={{
                        id: song.id || `song-${index}`,
                        name: song.name || song.title,
                        artist: song.artist || song.artists,
                        album: song.album || '',
                        image_url: song.albumArt || song.image || song.album_art || song.image_url || '',
                        preview_url: song.preview_url || '',
                      }}
                      size="medium"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={() => navigate("/profile/edit")}
            className="w-full"
            variant="outline"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("dashboard.editProfile")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
