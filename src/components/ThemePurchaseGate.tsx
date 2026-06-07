import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Gate GLOBALE per l'acquisto di un tema una-tantum (es. Dark Crow).
 * Al ritorno da Stripe l'URL contiene `?theme_session_id=...`: qui verifichiamo
 * il pagamento (edge function verify-theme-payment), sblocchiamo+applichiamo il
 * tema, mostriamo un toast e ripuliamo l'URL.
 */
export const ThemePurchaseGate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("theme_session_id");
    if (!sid) return;
    done.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-theme-payment", {
          body: { session_id: sid },
        });
        if (error) throw error;
        if ((data as any)?.success) {
          toast({
            title: "Tema sbloccato!",
            description: "Il Tema Dark Crow è ora tuo per sempre ed è stato applicato al profilo.",
          });
          // Aggiorna eventuali viste che dipendono dal profilo/tema.
          queryClient.invalidateQueries();
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
        // Rimuovi il parametro dall'URL senza ricaricare.
        params.delete("theme_session_id");
        const qs = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      }
    })();
  }, [toast, queryClient]);

  return null;
};
