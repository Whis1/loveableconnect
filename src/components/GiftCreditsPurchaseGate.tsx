import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Gate GLOBALE per l'acquisto dei pacchetti di CREDITI REGALO.
 * Al ritorno da Stripe l'URL contiene `?gift_credits_session_id=...`: qui
 * verifichiamo il pagamento (edge function verify-gift-credits-payment, che
 * accredita in modo idempotente), mostriamo un toast e ripuliamo l'URL.
 */
export const GiftCreditsPurchaseGate = () => {
  const { toast } = useToast();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("gift_credits_session_id");
    if (!sid) return;
    done.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-gift-credits-payment", {
          body: { session_id: sid },
        });
        if (error) throw error;
        if ((data as any)?.success) {
          toast({
            title: "Crediti regalo accreditati! 🎁",
            description: `Hai ricevuto ${(data as any).credits} crediti regalo: torna in chat e fai colpo.`,
          });
        } else {
          throw new Error("not paid");
        }
      } catch {
        toast({
          title: "Verifica acquisto",
          description: "Non riesco a confermare il pagamento. Se hai pagato, ricarica la pagina tra poco.",
          variant: "destructive",
        });
      } finally {
        params.delete("gift_credits_session_id");
        const qs = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      }
    })();
  }, [toast]);

  return null;
};
