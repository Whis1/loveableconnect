import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  relationship_type: string | null;
}

interface UserProfileCardProps {
  userId: string;
}

export const UserProfileCard = ({ userId }: UserProfileCardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
  }, [userId]);

  if (!profile) return null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-32 w-32 border-4 border-primary/10">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-4xl">
              {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 w-full">
            <div>
              <h2 className="text-2xl font-bold">{profile.nickname}</h2>
              <p className="text-muted-foreground">{profile.full_name}</p>
              {profile.age && (
                <p className="text-sm text-muted-foreground">{profile.age} anni</p>
              )}
            </div>

            {profile.city && (
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{profile.city}</span>
              </div>
            )}

            {profile.relationship_type && (
              <Badge variant="secondary" className="text-xs">
                Cerca: {
                  profile.relationship_type === 'serious' ? 'Relazione seria' :
                  profile.relationship_type === 'casual' ? 'Relazione occasionale' :
                  profile.relationship_type === 'friendship' ? 'Amicizia' :
                  profile.relationship_type
                }
              </Badge>
            )}
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
              <p className="text-sm font-semibold">Interessi</p>
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
            Modifica Profilo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
