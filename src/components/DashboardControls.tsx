import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InstallAppButton } from "@/components/InstallAppButton";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { markCurrentUserOffline } from "@/hooks/usePresenceTracking";

export const DashboardControls = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await markCurrentUserOffline();
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    // Fissi in alto a sinistra come in origine. Il contenuto della pagina si
    // tiene sotto (pt-16 in Dashboard) finche' la finestra non e' larga
    // almeno 1880px: solo li' i margini laterali bastano a non far scivolare
    // il logo sotto i pulsanti, a qualsiasi livello di zoom.
    <div className="fixed top-safe-3 left-3 z-50 flex items-center gap-1.5 md:gap-2">
      <LanguageSwitcher />
      {/* 🌓 Pulsante tema chiaro/scuro NASCOSTO su richiesta: il sito resta nel
          tema scuro di default. Per riattivarlo, ripristinare il <Button> con
          onClick toggleTheme (icone Sun/Moon di lucide-react + useTheme). */}
      <Button
        variant="outline"
        onClick={handleSignOut}
        className="h-8 md:h-9 px-2 md:px-3 text-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-all duration-300"
      >
        <LogOut className="h-4 w-4 md:mr-1.5" />
        <span className="hidden md:inline">{t("dashboard.signOut")}</span>
      </Button>
      <InstallAppButton />
    </div>
  );
};
