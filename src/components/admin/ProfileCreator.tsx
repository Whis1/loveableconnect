import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users } from "lucide-react";

export const ProfileCreator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    full_name: "",
    age: "",
    bio: "",
    city: "",
  });

  const handleSeedProfiles = async () => {
    setSeedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-profiles');

      if (error) throw error;

      toast({
        title: "Profili caricati",
        description: `${data.count} profili creati con successo!`,
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error("Error seeding profiles:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento dei profili",
        variant: "destructive",
      });
    } finally {
      setSeedLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!formData.nickname || !formData.full_name) {
      toast({
        title: "Errore",
        description: "Inserisci almeno nickname e nome completo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const profileId = crypto.randomUUID();
      console.log("Creating profile with ID:", profileId);

      const { data, error: profileError } = await supabase.from("profiles").insert({
        id: profileId,
        nickname: formData.nickname,
        full_name: formData.full_name,
        age: formData.age ? parseInt(formData.age) : null,
        bio: formData.bio || null,
        city: formData.city || null,
        is_admin_profile: true,
      }).select();

      console.log("Insert result:", { data, error: profileError });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw profileError;
      }

      toast({
        title: "Profilo creato",
        description: `Profilo ${formData.nickname} creato con successo`,
      });

      setFormData({
        nickname: "",
        full_name: "",
        age: "",
        bio: "",
        city: "",
      });

      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del profilo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Crea Nuovo Profilo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleSeedProfiles} 
          disabled={seedLoading}
          className="w-full"
          variant="secondary"
        >
          <Users className="h-4 w-4 mr-2" />
          {seedLoading ? "Caricamento..." : "Carica 50 Profili"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">oppure crea manualmente</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname *</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">Età</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Città</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
          />
        </div>

        <Button onClick={handleCreateProfile} disabled={loading} className="w-full">
          {loading ? "Creando..." : "Crea Profilo"}
        </Button>
      </CardContent>
    </Card>
  );
};
