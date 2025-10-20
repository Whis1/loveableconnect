import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageSquare, Save, Upload, X, Image as ImageIcon, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminChatDialog } from "./AdminChatDialog";

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  city: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  looking_for: string[] | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_profile?: { nickname: string; avatar_url?: string };
  receiver_profile?: { nickname: string; avatar_url?: string };
}

interface UserProfile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export const ProfileManager = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [profileLikes, setProfileLikes] = useState<{ [profileId: string]: string[] }>({});
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedChatProfile, setSelectedChatProfile] = useState<{ profileId: string; profileNickname: string; userId: string; userNickname: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProfiles();
    fetchUsers();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-profiles');
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load');
      const profilesData = (data.profiles || []) as Profile[];
      setProfiles(profilesData);
      
      if (profilesData.length > 0) {
        for (const profile of profilesData) {
          await fetchProfileLikes(profile.id);
        }
      }
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i profili",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, full_name, age, city, avatar_url, bio")
        .eq("is_admin_profile", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli utenti",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProfileLikes = async (profileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-profile-likes', {
        body: { profileId },
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load likes');
      const likedUserIds = (data.likes || []).map((l: { to_user_id: string }) => l.to_user_id);
      setProfileLikes(prev => ({ ...prev, [profileId]: likedUserIds }));
    } catch (error: any) {
      console.error("Error fetching profile likes:", error);
    }
  };

  const handleToggleLike = async (profileId: string, userId: string) => {
    const currentLikes = profileLikes[profileId] || [];
    const isLiked = currentLikes.includes(userId);

    try {
      const action = isLiked ? 'remove' : 'add';
      
      const { data, error } = await supabase.functions.invoke('admin-manage-like', {
        body: { 
          action, 
          fromUserId: profileId, 
          toUserId: userId 
        },
      });

      if (error || !data.success) {
        throw new Error(error?.message || data.error || 'Operation failed');
      }

      if (isLiked) {
        setProfileLikes(prev => ({
          ...prev,
          [profileId]: currentLikes.filter(id => id !== userId)
        }));

        toast({
          title: "Like rimosso",
          description: "Il like è stato rimosso",
        });
      } else {
        setProfileLikes(prev => ({
          ...prev,
          [profileId]: [...currentLikes, userId]
        }));

        toast({
          title: "Like aggiunto",
          description: "Il like è stato aggiunto",
        });
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchProfileMessages = async (profileId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          sender_profile:profiles!messages_sender_id_fkey(nickname, avatar_url),
          receiver_profile:profiles!messages_receiver_id_fkey(nickname, avatar_url)
        `)
        .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data as any || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i messaggi",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleAvatarUpload = async (profileId: string, file: File) => {
    setUploadingImages({ ...uploadingImages, [`${profileId}-avatar`]: true });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}-avatar-${Date.now()}.${fileExt}`;
      
      // Usa l'edge function per caricare con service role
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('bucket', 'profile-images');

      const { data, error: uploadError } = await supabase.functions.invoke('admin-upload-image', {
        body: formData,
      });

      if (uploadError || !data.success) {
        throw new Error(uploadError?.message || data.error || 'Upload failed');
      }

      // Usa l'edge function per aggiornare il profilo
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-profile', {
        body: { profileId, updates: { avatar_url: fileName } },
      });

      if (updateError || !updateData.success) {
        throw new Error(updateError?.message || updateData.error || 'Update failed');
      }

      toast({
        title: "Avatar caricato",
        description: "L'immagine profilo è stata aggiornata",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImages({ ...uploadingImages, [`${profileId}-avatar`]: false });
    }
  };

  const handleGalleryUpload = async (profileId: string, file: File) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    if ((profile.photos || []).length >= 6) {
      toast({
        title: "Limite raggiunto",
        description: "Puoi caricare massimo 6 foto",
        variant: "destructive",
      });
      return;
    }

    setUploadingImages({ ...uploadingImages, [`${profileId}-gallery`]: true });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}-gallery-${Date.now()}.${fileExt}`;
      
      // Usa l'edge function per caricare con service role
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('bucket', 'profile-images');

      const { data, error: uploadError } = await supabase.functions.invoke('admin-upload-image', {
        body: formData,
      });

      if (uploadError || !data.success) {
        throw new Error(uploadError?.message || data.error || 'Upload failed');
      }

      const updatedPhotos = [...(profile.photos || []), fileName];
      
      // Usa l'edge function per aggiornare il profilo
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-profile', {
        body: { profileId, updates: { photos: updatedPhotos } },
      });

      if (updateError || !updateData.success) {
        throw new Error(updateError?.message || updateData.error || 'Update failed');
      }

      toast({
        title: "Foto aggiunta",
        description: "La foto è stata aggiunta alla galleria",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error uploading gallery photo:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImages({ ...uploadingImages, [`${profileId}-gallery`]: false });
    }
  };

  const handleRemoveGalleryPhoto = async (profileId: string, photoUrl: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    try {
      // Usa l'edge function per eliminare con service role
      const { data, error: deleteError } = await supabase.functions.invoke('admin-delete-image', {
        body: { filePath: photoUrl, bucket: 'profile-images' },
      });

      if (deleteError || !data.success) {
        throw new Error(deleteError?.message || data.error || 'Delete failed');
      }

      const updatedPhotos = (profile.photos || []).filter(p => p !== photoUrl);
      
      // Usa l'edge function per aggiornare il profilo
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-update-profile', {
        body: { profileId, updates: { photos: updatedPhotos } },
      });

      if (updateError || !updateData.success) {
        throw new Error(updateError?.message || updateData.error || 'Update failed');
      }

      toast({
        title: "Foto rimossa",
        description: "La foto è stata rimossa dalla galleria",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error removing photo:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (profile: Profile) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-profile', {
        body: {
            profileId: profile.id,
            updates: {
              nickname: profile.nickname,
              age: profile.age,
              bio: profile.bio,
              city: profile.city,
              gender: profile.gender,
              sexual_orientation: profile.sexual_orientation,
              relationship_status: profile.relationship_status,
              looking_for: profile.looking_for,
              interests: profile.interests,
            }
          },
        });

      if (error || !data.success) {
        throw new Error(error?.message || data.error || 'Update failed');
      }

      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInterestsChange = (profileId: string, value: string) => {
    const interests = value.split(",").map((i) => i.trim()).filter(Boolean);
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const updated = { ...profile, interests };
      setProfiles(profiles.map((p) => (p.id === profileId ? updated : p)));
    }
  };

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter((profile) =>
    profile.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Caricamento profili...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestione Profili ({filteredProfiles.length})
          </CardTitle>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca per nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <Accordion type="single" collapsible className="space-y-2">
            {filteredProfiles.map((profile) => (
              <AccordionItem key={profile.id} value={profile.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {profile.avatar_url ? (
                        <AvatarImage 
                          src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl}
                        />
                      ) : null}
                      <AvatarFallback>{profile.nickname[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-semibold">{profile.nickname}</p>
                      <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Avatar */}
                    <div className="space-y-2">
                      <Label>Foto Profilo</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          {profile.avatar_url ? (
                            <AvatarImage 
                              src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl} 
                            />
                          ) : null}
                          <AvatarFallback>{profile.nickname[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAvatarUpload(profile.id, file);
                            }}
                            disabled={uploadingImages[`${profile.id}-avatar`]}
                            className="max-w-xs"
                          />
                          {uploadingImages[`${profile.id}-avatar`] && (
                            <p className="text-sm text-muted-foreground mt-1">Caricamento...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Galleria Foto */}
                    <div className="space-y-3">
                      <Label>Galleria Foto ({(profile.photos || []).length}/6)</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {(profile.photos || []).map((photoUrl, index) => (
                          <div key={index} className="relative group aspect-square">
                            <img
                              src={supabase.storage.from('profile-images').getPublicUrl(photoUrl).data.publicUrl}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveGalleryPhoto(profile.id, photoUrl)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {(profile.photos || []).length < 6 && (
                          <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleGalleryUpload(profile.id, file);
                              }}
                              disabled={uploadingImages[`${profile.id}-gallery`]}
                            />
                            {uploadingImages[`${profile.id}-gallery`] ? (
                              <p className="text-xs">Caricamento...</p>
                            ) : (
                              <>
                                <ImageIcon className="h-6 w-6 mb-1 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Aggiungi foto</p>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Info Base */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nickname</Label>
                        <Input
                          value={profile.nickname}
                          onChange={(e) => {
                            const updated = { ...profile, nickname: e.target.value };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Età</Label>
                        <Input
                          type="number"
                          value={profile.age || ""}
                          onChange={(e) => {
                            const updated = { ...profile, age: parseInt(e.target.value) || null };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Città</Label>
                      <Input
                        value={profile.city || ""}
                        onChange={(e) => {
                          const updated = { ...profile, city: e.target.value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                      />
                    </div>

                    {/* Genere */}
                    <div className="space-y-2">
                      <Label>Genere</Label>
                      <Select
                        value={profile.gender || ""}
                        onValueChange={(value) => {
                          const updated = { ...profile, gender: value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona genere" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="male">Uomo</SelectItem>
                          <SelectItem value="female">Donna</SelectItem>
                          <SelectItem value="non-binary">Non binario</SelectItem>
                          <SelectItem value="genderfluid">Genderfluid</SelectItem>
                          <SelectItem value="transexual">Transessuale</SelectItem>
                          <SelectItem value="transgender">Transgender</SelectItem>
                          <SelectItem value="other">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Orientamento Sessuale */}
                    <div className="space-y-2">
                      <Label>Orientamento Sessuale</Label>
                      <Select
                        value={profile.sexual_orientation || ""}
                        onValueChange={(value) => {
                          const updated = { ...profile, sexual_orientation: value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona orientamento" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="heterosexual">Eterosessuale</SelectItem>
                          <SelectItem value="homosexual">Omosessuale</SelectItem>
                          <SelectItem value="bisexual">Bisessuale</SelectItem>
                          <SelectItem value="pansexual">Pansessuale</SelectItem>
                          <SelectItem value="asexual">Asessuale</SelectItem>
                          <SelectItem value="other">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stato Relazione */}
                    <div className="space-y-2">
                      <Label>Stato Relazione</Label>
                      <Select
                        value={profile.relationship_status || ""}
                        onValueChange={(value) => {
                          const updated = { ...profile, relationship_status: value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="in_relationship">In una relazione</SelectItem>
                          <SelectItem value="married">Sposato/a</SelectItem>
                          <SelectItem value="divorced">Divorziato/a</SelectItem>
                          <SelectItem value="widowed">Vedovo/a</SelectItem>
                          <SelectItem value="prefer_not_say">Preferisco non dirlo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cosa Cerchi */}
                    <div className="space-y-2">
                      <Label>Cosa cerchi</Label>
                      <Select
                        value={(profile.looking_for || [])[0] || ""}
                        onValueChange={(value) => {
                          const updated = { ...profile, looking_for: value ? [value] : [] };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona cosa cerchi" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="Relazione seria">Relazione seria</SelectItem>
                          <SelectItem value="Incontri casuali">Incontri casuali</SelectItem>
                          <SelectItem value="Amicizia">Amicizia</SelectItem>
                          <SelectItem value="Non specifico">Non specifico</SelectItem>
                          <SelectItem value="Preferisco non dirlo">Preferisco non dirlo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Interessi */}
                    <div className="space-y-2">
                      <Label>Interessi (separati da virgola)</Label>
                      <Input
                        value={profile.interests?.join(", ") || ""}
                        onChange={(e) => handleInterestsChange(profile.id, e.target.value)}
                        placeholder="Es: Cinema, Sport, Viaggi"
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={profile.bio || ""}
                        onChange={(e) => {
                          const updated = { ...profile, bio: e.target.value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                        rows={3}
                        placeholder="Scrivi qualcosa su di te..."
                      />
                    </div>

                    {/* Azioni */}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleUpdateProfile(profile)} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Salva Modifiche
                      </Button>
                      
                      {/* Gestione Likes */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Users className="h-4 w-4 mr-2" />
                            Likes ({(profileLikes[profile.id] || []).length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Gestisci Like per {profile.nickname}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] pr-4">
                            {loadingUsers ? (
                              <p className="text-muted-foreground">Caricamento utenti...</p>
                            ) : users.length === 0 ? (
                              <p className="text-muted-foreground">Nessun utente disponibile</p>
                            ) : (
                              <div className="space-y-2">
                                {users.map((user) => {
                                  const isLiked = (profileLikes[profile.id] || []).includes(user.id);
                                  return (
                                    <div 
                                      key={user.id} 
                                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                          {user.avatar_url ? (
                                            <AvatarImage 
                                              src={supabase.storage.from('profile-images').getPublicUrl(user.avatar_url).data.publicUrl}
                                            />
                                          ) : null}
                                          <AvatarFallback>{user.nickname[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-semibold">{user.nickname}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {user.full_name} • {user.age} anni • {user.city}
                                          </p>
                                          {user.bio && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                              {user.bio}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                       <div className="flex gap-2">
                                        <Button
                                          variant={isLiked ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => handleToggleLike(profile.id, user.id)}
                                        >
                                          {isLiked ? "❤️ Rimuovi" : "🤍 Like"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedChatProfile({
                                              profileId: profile.id,
                                              profileNickname: profile.nickname,
                                              userId: user.id,
                                              userNickname: user.nickname,
                                            });
                                            setChatDialogOpen(true);
                                          }}
                                        >
                                          <MessageSquare className="h-4 w-4 mr-1" />
                                          Chat
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>

      {/* Admin Chat Dialog */}
      <AdminChatDialog
        open={chatDialogOpen && selectedChatProfile !== null}
        onOpenChange={(open) => {
          setChatDialogOpen(open);
          if (!open) {
            setSelectedChatProfile(null);
          }
        }}
        adminProfileId={selectedChatProfile?.profileId || ''}
        adminNickname={selectedChatProfile?.profileNickname || ''}
        userId={selectedChatProfile?.userId || ''}
        userNickname={selectedChatProfile?.userNickname || ''}
      />
    </Card>
  );
};
