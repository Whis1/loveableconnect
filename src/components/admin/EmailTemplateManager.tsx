import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Edit, RotateCcw, Eye, Save, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description: string;
  subject: string;
  html_content: string;
  default_html_content: string;
  created_at: string;
  updated_at: string;
}

export function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await (supabase
        .from('email_templates' as any)
        .select('*')
        .order('template_name') as any);

      if (error) throw error;
      setTemplates((data as EmailTemplate[]) || []);
    } catch (error: any) {
      toast.error("Errore nel caricamento dei template: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedContent(template.html_content);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const { error } = await (supabase
        .from('email_templates' as any) as any)
        .update({
          subject: editedSubject,
          html_content: editedContent,
        } as any)
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template salvato con successo!");
      loadTemplates();
      
      // Aggiorna il template selezionato
      setSelectedTemplate({
        ...selectedTemplate,
        subject: editedSubject,
        html_content: editedContent,
      });
    } catch (error: any) {
      toast.error("Errore nel salvataggio: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!selectedTemplate) return;

    if (!confirm("Sei sicuro di voler ripristinare il template originale? Perderai tutte le modifiche personalizzate.")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase
        .from('email_templates' as any) as any)
        .update({
          subject: selectedTemplate.subject,
          html_content: selectedTemplate.default_html_content,
        } as any)
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template ripristinato!");
      setEditedContent(selectedTemplate.default_html_content);
      loadTemplates();
    } catch (error: any) {
      toast.error("Errore nel ripristino: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openEmailDialog = (templateKey: string) => {
    setSelectedEmailTemplate(templateKey);
    setEmailDialogOpen(true);
  };

  const sendEmail = async () => {
    if (!recipientEmail || !selectedEmailTemplate) {
      toast.error("Inserisci un indirizzo email valido");
      return;
    }

    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('test-email-template', {
        body: { 
          templateKey: selectedEmailTemplate,
          recipientEmail: recipientEmail 
        },
      });

      if (error) throw error;

      toast.success("Email inviata con successo!");
      setEmailDialogOpen(false);
      setRecipientEmail("");
      setSelectedEmailTemplate(null);
    } catch (error: any) {
      toast.error("Errore nell'invio dell'email: " + error.message);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <div className="p-4">Caricamento template...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gestione Template Email
          </CardTitle>
          <CardDescription>
            Modifica i template delle email automatiche inviate dalla piattaforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Dialog key={template.id}>
                <DialogTrigger asChild>
                  <Card 
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => openTemplate(template)}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {template.template_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <strong>Oggetto:</strong> {template.subject}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEmailDialog(template.template_key);
                        }}
                      >
                        <Send className="w-3 h-3" />
                        Invia Email
                      </Button>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>{template.template_name}</DialogTitle>
                    <DialogDescription>{template.description}</DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="edit" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="edit" className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Modifica
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Anteprima
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="edit" className="space-y-4">
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="subject">Oggetto Email</Label>
                            <Input
                              id="subject"
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                              placeholder="Oggetto dell'email"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="content">Contenuto HTML</Label>
                            <Textarea
                              id="content"
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              rows={15}
                              className="font-mono text-sm"
                              placeholder="Contenuto HTML dell'email"
                            />
                            <div className="text-xs text-muted-foreground">
                              <strong>Variabili disponibili:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {template.template_key === 'like_notification' && (
                                  <li>{'{{likerNickname}}'} - Nickname di chi ha messo like</li>
                                )}
                                {template.template_key === 'message_notification' && (
                                  <>
                                    <li>{'{{senderNickname}}'} - Nickname del mittente</li>
                                    <li>{'{{messagePreview}}'} - Anteprima del messaggio</li>
                                  </>
                                )}
                                {template.template_key === 'purchase_credits' && (
                                  <>
                                    <li>{'{{creditsAmount}}'} - Numero di crediti acquistati</li>
                                    <li>{'{{amountPaid}}'} - Importo pagato</li>
                                    <li>{'{{newBalance}}'} - Nuovo saldo crediti</li>
                                  </>
                                )}
                                {(template.template_key === 'subscription_purchased' || 
                                  template.template_key === 'subscription_renewed' ||
                                  template.template_key === 'subscription_expired' ||
                                  template.template_key === 'subscription_expiring') && (
                                  <>
                                    <li>{'{{subscriptionType}}'} - Tipo abbonamento</li>
                                    <li>{'{{tier}}'} - Tier dell'abbonamento</li>
                                    <li>{'{{expiresAt}}'} - Data scadenza</li>
                                    <li>{'{{benefits}}'} - Lista vantaggi</li>
                                  </>
                                )}
                                {template.template_key === 'gift_subscription' && (
                                  <>
                                    <li>{'{{senderNickname}}'} - Nickname del donatore</li>
                                    <li>{'{{expiresAt}}'} - Data scadenza</li>
                                    <li>{'{{benefits}}'} - Lista vantaggi</li>
                                  </>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={saveTemplate} disabled={saving} className="flex items-center gap-2">
                          <Save className="w-4 h-4" />
                          {saving ? "Salvataggio..." : "Salva Modifiche"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={resetToDefault}
                          disabled={saving}
                          className="flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Ripristina Originale
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview">
                      <ScrollArea className="h-[500px]">
                        <div className="border rounded-lg p-4 bg-background">
                          <div className="mb-4 pb-4 border-b">
                            <div className="text-sm font-semibold">Oggetto:</div>
                            <div className="text-sm text-muted-foreground">{editedSubject}</div>
                          </div>
                          <div 
                            dangerouslySetInnerHTML={{ __html: editedContent }}
                            className="prose prose-sm max-w-none"
                          />
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invia Email</DialogTitle>
            <DialogDescription>
              Inserisci l'indirizzo email del destinatario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Email destinatario</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="esempio@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={sendEmail} 
              disabled={sendingEmail || !recipientEmail}
              className="w-full"
            >
              {sendingEmail ? "Invio..." : "Invia Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}