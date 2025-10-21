import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Heart, MapPin } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import { getGenericLocationPhrase } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useTextTranslation } from "@/hooks/useTranslation";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  city: string | null;
  gender: string | null;
  relationship_type: string | null;
  relationship_status: string | null;
  sexual_orientation: string | null;
  looking_for: string[] | null;
  interests: string[] | null;
  photos: string[] | null;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
  translatedGender?: string | null;
  translatedOrientation?: string | null;
  translatedRelationshipType?: string | null;
}

interface ChatUserProfileProps {
  userId: string;
  currentUserId?: string;
  showRealLocation?: boolean;
}

export const ChatUserProfile = ({ userId, currentUserId, showRealLocation = false }: ChatUserProfileProps) => {
  const { t } = useTranslation();
  const { translateText, translateArray } = useTextTranslation();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memorizza la frase di location per non cambiarla ad ogni render
  const locationPhrase = useMemo(() => getGenericLocationPhrase(), []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) throw error;
        
        // Translate bio and interests
        const translatedBio = data.bio ? await translateText(data.bio) : null;
        const translatedInterests = data.interests ? await translateArray(data.interests) : null;

        // Normalize possible localized stored values for gender/orientation/relationship_type
        const genderCodes = ['male','female','non-binary','transexual','transgender','genderfluid'];
        const orientationCodes = ['heterosexual','homosexual','bisexual','pansexual','asexual','other'];
        const relationshipTypeCodes = ['serious','casual','friendship','not-sure','prefer-not-say'];

        const translatedGender = data.gender && !genderCodes.includes(data.gender)
          ? await translateText(data.gender)
          : null;
        const translatedOrientation = data.sexual_orientation && !orientationCodes.includes(data.sexual_orientation)
          ? await translateText(data.sexual_orientation)
          : null;
        const translatedRelationshipType = data.relationship_type && !relationshipTypeCodes.includes(data.relationship_type)
          ? await translateText(data.relationship_type)
          : null;
        
        setProfile({
          ...data,
          translatedBio,
          translatedInterests,
          translatedGender,
          translatedOrientation,
          translatedRelationshipType
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to profile changes
    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        async (payload) => {
          console.log('Profile updated:', payload.new);
          const newProfile = payload.new as Profile;
          const translatedBio = newProfile.bio ? await translateText(newProfile.bio) : null;
          const translatedInterests = newProfile.interests ? await translateArray(newProfile.interests) : null;
          const genderCodes = ['male','female','non-binary','transexual','transgender','genderfluid'];
          const orientationCodes = ['heterosexual','homosexual','bisexual','pansexual','asexual','other'];
          const relationshipTypeCodes = ['serious','casual','friendship','not-sure','prefer-not-say'];
          const translatedGender = newProfile.gender && !genderCodes.includes(newProfile.gender)
            ? await translateText(newProfile.gender)
            : null;
          const translatedOrientation = newProfile.sexual_orientation && !orientationCodes.includes(newProfile.sexual_orientation)
            ? await translateText(newProfile.sexual_orientation)
            : null;
          const translatedRelationshipType = newProfile.relationship_type && !relationshipTypeCodes.includes(newProfile.relationship_type)
            ? await translateText(newProfile.relationship_type)
            : null;
          
          setProfile({
            ...newProfile,
            translatedBio,
            translatedInterests,
            translatedGender,
            translatedOrientation,
            translatedRelationshipType
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, translateText, translateArray]);



  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">{t("chat.loadingProfile")}</p>
      </div>
    );
  }

  if (!profile) return null;

  const hasPhotos = profile.photos && profile.photos.length > 0;

  return (
    <Card className="border-b rounded-none bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 shadow-sm">
      <div className="p-4">
        {/* Header con Avatar e Nome */}
        <div className="flex items-center gap-3 mb-3">
          <ImageDialog 
            src={profile.avatar_url ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl : ''} 
            alt={profile.nickname}
          >
            <Avatar className="h-16 w-16 ring-2 ring-primary/20 cursor-pointer hover:ring-primary/40 transition-all shadow-md">
              {profile.avatar_url ? (
                <AvatarImage 
                  src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl}
                />
              ) : null}
              <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-secondary/20">
                {profile.nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </ImageDialog>

          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">{profile.nickname}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {profile.age && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {profile.age} {t("chat.years")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {showRealLocation ? (profile.city || t("common.notSpecified")) : t("common.nearbyLocation")}
              </span>
            </div>
          </div>
        </div>

        {/* Info compatte in griglia */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
          {/* Genere */}
          {profile.gender && (
            <div className="flex items-start gap-1">
              <span className="font-medium text-foreground/80">{t("common.gender")}</span>
              <span className="text-muted-foreground">
                {profile.gender === 'male' ? t("common.male") : 
                 profile.gender === 'female' ? t("common.female") : 
                 profile.gender === 'non-binary' ? t("common.nonBinary") :
                 profile.gender === 'transexual' ? t("common.transexual") :
                 profile.gender === 'transgender' ? t("common.transgender") :
                 profile.gender === 'genderfluid' ? t("common.genderfluid") :
                 (profile.translatedGender || profile.gender)}
              </span>
            </div>
          )}
          
          {/* In cerca - accanto al genere */}
          {(profile.relationship_type || (profile.looking_for && profile.looking_for.length > 0)) && (
            <div className="flex items-start gap-1">
              <span className="font-medium text-foreground/80">{t("common.lookingFor")}</span>
              <span className="text-muted-foreground">
                {profile.relationship_type
                  ? (
                    profile.relationship_type === 'serious' ? t("common.seriousRelationship") :
                    profile.relationship_type === 'casual' ? t("common.casualDating") :
                    profile.relationship_type === 'friendship' ? t("common.friendship") :
                    profile.relationship_type === 'not-sure' ? t("common.notSure") :
                    profile.relationship_type === 'prefer-not-say' ? t("common.preferNotSay") :
                    (profile.translatedRelationshipType || profile.relationship_type)
                    )
                  : (profile.looking_for?.join(', ') || '')}
              </span>
            </div>
          )}
          
          {/* Stato relazionale */}
          {profile.relationship_status && (
            <div className="flex items-start gap-1">
              <span className="font-medium text-foreground/80">{t("common.relationshipStatus")}</span>
              <span className="text-muted-foreground">
                {profile.relationship_status === 'single' ? t("common.single") : 
                 profile.relationship_status === 'in_relationship' ? t("common.inRelationship") :
                 profile.relationship_status === 'married' ? t("common.married") :
                 profile.relationship_status === 'divorced' ? t("common.divorced") :
                 profile.relationship_status === 'widowed' ? t("common.widowed") :
                 profile.relationship_status === 'prefer_not_say' ? t("common.preferNotSay") :
                 profile.relationship_status}
              </span>
            </div>
          )}
          
          {/* Orientamento - sotto stato relazionale */}
          {profile.sexual_orientation && (
            <div className="flex items-start gap-1">
              <span className="font-medium text-foreground/80">{t("common.orientation")}</span>
              <span className="text-muted-foreground">
                {profile.sexual_orientation === 'heterosexual' ? t("common.heterosexual") :
                 profile.sexual_orientation === 'homosexual' ? t("common.homosexual") :
                 profile.sexual_orientation === 'bisexual' ? t("common.bisexual") :
                 profile.sexual_orientation === 'pansexual' ? t("common.pansexual") :
                 profile.sexual_orientation === 'asexual' ? t("common.asexual") :
                 profile.sexual_orientation === 'other' ? t("common.other") :
                 (profile.translatedOrientation || profile.sexual_orientation)}
              </span>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-3 p-2.5 bg-background/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {profile.translatedBio || profile.bio}
            </p>
          </div>
        )}

        {/* Interessi */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {(profile.translatedInterests || profile.interests).slice(0, 6).map((interest, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 border-none"
                >
                  {interest}
                </Badge>
              ))}
              {profile.interests.length > 6 && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-2 py-0.5 bg-muted"
                >
                  +{profile.interests.length - 6}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Galleria foto */}
        {hasPhotos && (
          <div>
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-foreground/70">
              <User className="h-3.5 w-3.5" />
              {t("chat.photoGallery")}
            </h4>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {profile.photos.map((photo, index) => {
                  const photoUrl = supabase.storage.from('profile-images').getPublicUrl(photo).data.publicUrl;
                  
                  return (
                    <ImageDialog 
                      key={index} 
                      src={photoUrl} 
                      alt={`${t("chat.photo")} ${index + 1}`}
                    >
                      <img
                        src={photoUrl}
                        alt={`${t("chat.photo")} ${index + 1}`}
                        className="h-16 w-16 object-cover rounded-md cursor-pointer hover:opacity-80 hover:scale-105 transition-all flex-shrink-0 shadow-sm"
                      />
                    </ImageDialog>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

      </div>
    </Card>
  );
};
