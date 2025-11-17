import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    document.title = "Accesso in corso…";

    const url = new URL(window.location.href);
    const error = url.searchParams.get("error") || url.hash.includes("error");
    if (error) {
      toast({
        title: t("auth.errorSignIn"),
        description: t("auth.oauthError") || String(error),
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
      return;
    }

    const finalize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Wait a moment to ensure profile triggers have run
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("birthdate, city")
            .eq("id", session.user!.id)
            .maybeSingle();

          if (profile && (!profile.birthdate || !profile.city)) {
            navigate("/profile/edit", { replace: true, state: { requiresCompletion: true } });
          } else {
            navigate("/", { replace: true });
          }
        }, 600);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setProcessing(false);
        finalize();
      }
    });

    // Also check immediately (in case tokens are already processed)
    finalize();

    // Safety timeout
    const timeout = setTimeout(() => {
      setProcessing(false);
      toast({
        title: t("auth.errorSignIn"),
        description: t("auth.oauthTimeout") || "Timeout durante l'accesso. Riprova.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, t, toast]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">{t("auth.signingIn") || "Accesso in corso…"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.wait") || "Attendi qualche secondo mentre completiamo l'accesso."}</p>
      </div>
    </main>
  );
};

export default AuthCallback;
