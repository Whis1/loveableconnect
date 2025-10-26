import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

interface ProfileNotebookProps {
  profileId: string;
  profileName: string;
  isAdmin?: boolean;
}

interface Notes {
  nome: string;
  eta: string;
  location: string;
  relazione: string;
  figli: string;
  hobby: string;
  lavoro: string;
  altro: string;
  compleanno: string;
  fumatore: string;
  piercings: string;
  tatuaggi: string;
  colore_occhi: string;
  colore_capelli: string;
  peso_altezza: string;
}

export const ProfileNotebook = ({ profileId, profileName, isAdmin = false }: ProfileNotebookProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Notes>({
    nome: "",
    eta: "",
    location: "",
    relazione: "",
    figli: "",
    hobby: "",
    lavoro: "",
    altro: "",
    compleanno: "",
    fumatore: "",
    piercings: "",
    tatuaggi: "",
    colore_occhi: "",
    colore_capelli: "",
    peso_altezza: "",
  });

  useEffect(() => {
    if (!profileId) return;
    fetchNotes();
  }, [profileId]);

  const fetchNotes = async () => {
    if (!profileId) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-profile-notes-get', {
        body: { profile_id: profileId }
      });

      if (error) throw error;
      
      if (data?.notes) {
        setNotes({
          nome: data.notes.nome || "",
          eta: data.notes.eta || "",
          location: data.notes.location || "",
          relazione: data.notes.relazione || "",
          figli: data.notes.figli || "",
          hobby: data.notes.hobby || "",
          lavoro: data.notes.lavoro || "",
          altro: data.notes.altro || "",
          compleanno: data.notes.compleanno || "",
          fumatore: data.notes.fumatore || "",
          piercings: data.notes.piercings || "",
          tatuaggi: data.notes.tatuaggi || "",
          colore_occhi: data.notes.colore_occhi || "",
          colore_capelli: data.notes.colore_capelli || "",
          peso_altezza: data.notes.peso_altezza || "",
        });
      } else {
        setNotes({ 
          nome: "", 
          eta: "", 
          location: "", 
          relazione: "", 
          figli: "", 
          hobby: "", 
          lavoro: "", 
          altro: "",
          compleanno: "",
          fumatore: "",
          piercings: "",
          tatuaggi: "",
          colore_occhi: "",
          colore_capelli: "",
          peso_altezza: "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleBlur = async (field: keyof Notes, value: string) => {
    if (!profileId) return;
    try {
      console.log('Saving note:', { profile_id: profileId, field, value });
      
      const { data, error } = await supabase.functions.invoke('admin-profile-notes-upsert', {
        body: {
          profile_id: profileId,
          field,
          value
        }
      });

      console.log('Save response:', { data, error });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la nota",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof Notes, value: string) => {
    setNotes(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          Note {isAdmin ? "Admin" : "Utente"}: {profileName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full px-6 py-4">
          <div className="space-y-3 pr-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome:</label>
              <Input
                value={notes.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                onBlur={(e) => handleBlur("nome", e.target.value)}
                placeholder="Inserisci nome..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Età:</label>
              <Input
                value={notes.eta}
                onChange={(e) => handleChange("eta", e.target.value)}
                onBlur={(e) => handleBlur("eta", e.target.value)}
                placeholder="Inserisci età..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Compleanno:</label>
              <Input
                value={notes.compleanno}
                onChange={(e) => handleChange("compleanno", e.target.value)}
                onBlur={(e) => handleBlur("compleanno", e.target.value)}
                placeholder="Inserisci data di nascita..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Location:</label>
              <Textarea
                value={notes.location}
                onChange={(e) => handleChange("location", e.target.value)}
                onBlur={(e) => handleBlur("location", e.target.value)}
                placeholder="Inserisci location..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Relazione:</label>
              <Textarea
                value={notes.relazione}
                onChange={(e) => handleChange("relazione", e.target.value)}
                onBlur={(e) => handleBlur("relazione", e.target.value)}
                placeholder="Inserisci stato relazione..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Figli:</label>
              <Textarea
                value={notes.figli}
                onChange={(e) => handleChange("figli", e.target.value)}
                onBlur={(e) => handleBlur("figli", e.target.value)}
                placeholder="Inserisci info figli..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hobby:</label>
              <Textarea
                value={notes.hobby}
                onChange={(e) => handleChange("hobby", e.target.value)}
                onBlur={(e) => handleBlur("hobby", e.target.value)}
                placeholder="Inserisci hobby..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Lavoro:</label>
              <Textarea
                value={notes.lavoro}
                onChange={(e) => handleChange("lavoro", e.target.value)}
                onBlur={(e) => handleBlur("lavoro", e.target.value)}
                placeholder="Inserisci lavoro..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fumatore:</label>
              <Input
                value={notes.fumatore}
                onChange={(e) => handleChange("fumatore", e.target.value)}
                onBlur={(e) => handleBlur("fumatore", e.target.value)}
                placeholder="Sì/No..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Piercings:</label>
              <Textarea
                value={notes.piercings}
                onChange={(e) => handleChange("piercings", e.target.value)}
                onBlur={(e) => handleBlur("piercings", e.target.value)}
                placeholder="Inserisci info piercings..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tatuaggi:</label>
              <Textarea
                value={notes.tatuaggi}
                onChange={(e) => handleChange("tatuaggi", e.target.value)}
                onBlur={(e) => handleBlur("tatuaggi", e.target.value)}
                placeholder="Inserisci info tatuaggi..."
                className="text-sm min-h-[32px] resize-none"
                rows={1}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Colore degli occhi:</label>
              <Input
                value={notes.colore_occhi}
                onChange={(e) => handleChange("colore_occhi", e.target.value)}
                onBlur={(e) => handleBlur("colore_occhi", e.target.value)}
                placeholder="Inserisci colore occhi..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Colore dei capelli:</label>
              <Input
                value={notes.colore_capelli}
                onChange={(e) => handleChange("colore_capelli", e.target.value)}
                onBlur={(e) => handleBlur("colore_capelli", e.target.value)}
                placeholder="Inserisci colore capelli..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Peso e altezza:</label>
              <Input
                value={notes.peso_altezza}
                onChange={(e) => handleChange("peso_altezza", e.target.value)}
                onBlur={(e) => handleBlur("peso_altezza", e.target.value)}
                placeholder="Es: 70kg, 175cm..."
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Altro:</label>
              <Textarea
                value={notes.altro}
                onChange={(e) => handleChange("altro", e.target.value)}
                onBlur={(e) => handleBlur("altro", e.target.value)}
                placeholder="Altre note..."
                className="text-sm min-h-[60px] resize-y"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};