import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Headset } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Pannello GLOBALE di valutazione assistenza. Quando un operatore conclude
 * (elimina) la chat di supporto di un utente, viene creata una richiesta
 * `support_ratings` con status='pending' per quell'utente. Questo componente,
 * montato a livello app, la rileva (subito via realtime o al caricamento) e
 * mostra il pannello a stelle ovunque l'utente si trovi.
 */
export const SupportRatingGate = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Utente loggato
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Controllo richieste pendenti + realtime
  useEffect(() => {
    if (!userId) {
      setPendingId(null);
      return;
    }
    let active = true;
    const reset = () => {
      setRating(0);
      setHover(0);
      setComment("");
    };
    (async () => {
      const { data } = await (supabase.from("support_ratings") as any)
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active && data?.id) {
        reset();
        setPendingId(data.id);
      }
    })();

    const channel = supabase
      .channel(`support-rating-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ratings", filter: `user_id=eq.${userId}` },
        (payload) => {
          if ((payload.new as any)?.status === "pending") {
            reset();
            setPendingId((payload.new as any).id);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = async () => {
    const id = pendingId;
    setPendingId(null);
    if (id) {
      await (supabase.from("support_ratings") as any).update({ status: "dismissed" }).eq("id", id);
    }
  };

  const submit = async () => {
    if (!pendingId || rating === 0) return;
    setSubmitting(true);
    try {
      await (supabase.from("support_ratings") as any)
        .update({
          rating,
          comment: comment.trim() || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", pendingId);
      toast({ title: "Grazie!", description: "La tua valutazione è stata inviata." });
      setPendingId(null);
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingId) return null;

  return (
    <Dialog open={!!pendingId} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-sm border-purple-500/20 bg-gradient-to-br from-[#241433] via-[#1a1026] to-[#2a1640]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Headset className="h-5 w-5 text-pink-400" />
            <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent font-extrabold">
              Com'è andata l'assistenza?
            </span>
          </DialogTitle>
          <DialogDescription className="text-purple-200/70">
            Come valuteresti l'assistenza appena ricevuta?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
              aria-label={`${n} stelle`}
            >
              <Star
                className={`h-9 w-9 transition-colors ${
                  (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-purple-300/40"
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Facoltativo: se vuoi, aggiungi qualche informazione in più sull'assistenza ricevuta..."
          className="min-h-[80px] bg-white/5 border-white/10 text-purple-50 placeholder:text-purple-300/40"
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            onClick={dismiss}
            disabled={submitting}
            className="border-white/15 bg-white/5 text-purple-100 hover:bg-white/10 hover:text-white"
          >
            Non ora
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || rating === 0}
            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white border-0"
          >
            {submitting ? "Invio..." : "Invia valutazione"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
