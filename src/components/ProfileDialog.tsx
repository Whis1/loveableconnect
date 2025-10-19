import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
}

interface ProfileDialogProps {
  profileId: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({
  profileId,
  currentUserId,
  open,
  onOpenChange,
}: ProfileDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !profileId) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (data) {
        setProfile(data);
        
        // Get avatar URL
        if (data.avatar_url) {
          const { data: urlData } = supabase.storage
            .from("profile-images")
            .getPublicUrl(data.avatar_url);
          setAvatarUrl(urlData.publicUrl);
        }

        // Get photo URLs
        if (data.photos && data.photos.length > 0) {
          const urls = data.photos.map((photo: string) => {
            const { data: urlData } = supabase.storage
              .from("profile-images")
              .getPublicUrl(photo);
            return urlData.publicUrl;
          });
          setPhotoUrls(urls);
        }
      }

      // Check if already liked
      const { data: likeData } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profileId)
        .maybeSingle();

      setHasLiked(!!likeData);
    };

    fetchProfile();
  }, [profileId, currentUserId, open]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", currentUserId)
        .eq("to_user_id", profileId)
        .maybeSingle();

      if (existingLike) {
        // Remove like
        await supabase.from("likes").delete().eq("id", existingLike.id);
        setHasLiked(false);
        toast({
          title: "Like rimosso",
          description: `Hai rimosso il like da ${profile?.nickname || profile?.full_name}`,
        });
      } else {
        // Add like
        await supabase.from("likes").insert({
          from_user_id: currentUserId,
          to_user_id: profileId,
        });
        setHasLiked(true);

        // Check for match
        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
          .maybeSingle();

        if (matchData) {
          toast({
            title: "È un Match! 💕",
            description: `Hai fatto match con ${profile?.nickname || profile?.full_name}!`,
          });
        } else {
          toast({
            title: "Like inviato",
            description: `Like inviato a ${profile?.nickname || profile?.full_name}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleChat = async () => {
    // Check for match
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${currentUserId})`)
      .maybeSingle();

    if (matchData) {
      navigate(`/chat/${matchData.id}`);
      onOpenChange(false);
    } else {
      toast({
        title: "Match richiesto",
        description: "Devi fare match con questo utente prima di poter chattare",
        variant: "destructive",
      });
    }
  };

  if (!profile) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Profilo</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header with avatar and basic info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-lg">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-4xl">
                  {profile.nickname?.charAt(0) || profile.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-2xl font-bold">{profile.nickname || profile.full_name}</h2>
                <div className="flex items-center justify-center gap-2 text-muted-foreground mt-1">
                  {profile.age && <span>{profile.age} anni</span>}
                  {profile.age && profile.gender && <span>•</span>}
                  {profile.gender && (
                    <span className="capitalize">
                      {profile.gender === 'male' && 'Uomo'}
                      {profile.gender === 'female' && 'Donna'}
                      {profile.gender === 'transexual' && 'Transessuale'}
                      {profile.gender === 'transgender' && 'Transgender'}
                      {profile.gender === 'genderfluid' && 'Genderfluid'}
                      {profile.gender === 'non-binary' && 'Non-binario'}
                    </span>
                  )}
                </div>
              </div>

              {profile.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.city}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Bio</h3>
                <p className="text-muted-foreground italic border-l-2 border-primary/20 pl-4">
                  "{profile.bio}"
                </p>
              </div>
            )}

            {/* Relationship info */}
            <div className="space-y-2">
              {profile.relationship_type && (
                <Badge variant="secondary">
                  Cerca: {
                    profile.relationship_type === 'serious' ? 'Relazione seria' :
                    profile.relationship_type === 'casual' ? 'Relazione casual' :
                    profile.relationship_type === 'friendship' ? 'Amicizia' :
                    profile.relationship_type
                  }
                </Badge>
              )}
              {profile.relationship_status && (
                <Badge variant="outline">
                  {profile.relationship_status === 'single' && 'Single'}
                  {profile.relationship_status === 'in_relationship' && 'In una relazione'}
                  {profile.relationship_status === 'married' && 'Sposato/a'}
                  {profile.relationship_status === 'divorced' && 'Divorziato/a'}
                  {profile.relationship_status === 'widowed' && 'Vedovo/a'}
                </Badge>
              )}
              {profile.sexual_orientation && (
                <Badge variant="outline">
                  {profile.sexual_orientation === 'heterosexual' && 'Eterosessuale'}
                  {profile.sexual_orientation === 'homosexual' && 'Omosessuale'}
                  {profile.sexual_orientation === 'bisexual' && 'Bisessuale'}
                  {profile.sexual_orientation === 'pansexual' && 'Pansessuale'}
                  {profile.sexual_orientation === 'asexual' && 'Asessuale'}
                </Badge>
              )}
            </div>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Interessi</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Gallery */}
            {photoUrls.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Foto</h3>
                <div className="grid grid-cols-3 gap-3">
                  {photoUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(url)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant={hasLiked ? "default" : "outline"}
                size="lg"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                disabled={isLiking}
              >
                <Heart className={`h-5 w-5 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
                {hasLiked ? 'Rimuovi Like' : 'Mi Piace'}
              </Button>
              <Button
                variant="default"
                size="lg"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChat();
                }}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Messaggio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
            <div className="relative">
              <img
                src={selectedImage || ""}
                alt="Foto ingrandita"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
