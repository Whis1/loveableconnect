import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import profileBackground from "@/assets/profile-background.png";
import { useAdminRole } from "@/hooks/useAdminRole";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  sexual_orientation: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  relationship_type: string | null;
  relationship_status: string | null;
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
        setProfile(data);
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
          const updatedProfile = payload.new as Profile;
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

  if (!profile) return null;

  return (
    <Card className="overflow-hidden relative">
      {/* Background Image */}
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
              {profile.age && (
                <p className="text-sm text-muted-foreground">{profile.age} {t("userProfile.years")}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {(!adminLoading && isAdmin) || (currentUserId === profile.id) 
                  ? (profile.city || "Vicino alle tue parti") 
                  : "Vicino alle tue parti"}
              </span>
            </div>

            {/* Info badges row */}
            <div className="flex flex-wrap gap-2 justify-center items-center w-full">
              {profile.gender && (
                <Badge variant="outline" className="text-xs">
                  {profile.gender === 'male' ? 'Uomo' :
                   profile.gender === 'female' ? 'Donna' :
                   profile.gender === 'non_binary' ? 'Non binario' :
                   profile.gender === 'other' ? 'Altro' :
                   profile.gender}
                </Badge>
              )}
              
              {profile.sexual_orientation && (
                <Badge variant="outline" className="text-xs">
                  {profile.sexual_orientation === 'heterosexual' ? 'Eterosessuale' :
                   profile.sexual_orientation === 'homosexual' ? 'Omosessuale' :
                   profile.sexual_orientation === 'bisexual' ? 'Bisessuale' :
                   profile.sexual_orientation === 'pansexual' ? 'Pansessuale' :
                   profile.sexual_orientation === 'asexual' ? 'Asessuale' :
                   profile.sexual_orientation === 'other' ? 'Altro' :
                   profile.sexual_orientation}
                </Badge>
              )}
              
              {profile.relationship_status && (
                <Badge variant="outline" className="text-xs">
                  {profile.relationship_status === 'single' ? 'Single' :
                   profile.relationship_status === 'in_relationship' ? 'Impegnato/a' :
                   profile.relationship_status === 'married' ? 'Sposato/a' :
                   profile.relationship_status === 'divorced' ? 'Divorziato/a' :
                   profile.relationship_status === 'widowed' ? 'Vedovo/a' :
                   profile.relationship_status === 'prefer_not_say' ? 'Preferisco non dirlo' :
                   profile.relationship_status}
                </Badge>
              )}
              
              {profile.relationship_type && (
                <Badge variant="secondary" className="text-xs">
                  {profile.relationship_type === 'serious' ? 'Relazione seria' :
                   profile.relationship_type === 'casual' ? 'Casual' :
                   profile.relationship_type === 'friendship' ? 'Amicizia' :
                   profile.relationship_type === 'open' ? 'Relazione aperta' :
                   profile.relationship_type}
                </Badge>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="w-full">
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/20 pl-4">
                "{profile.bio}"
              </p>
            </div>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-sm font-semibold">{t("userProfile.interests")}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.interests.map((interest, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
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
