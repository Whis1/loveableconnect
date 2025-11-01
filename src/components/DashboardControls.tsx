import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const DashboardControls = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="fixed top-3 left-3 z-50 flex items-center gap-1.5 md:gap-2">
      <LanguageSwitcher />
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        title={theme === "dark" ? "Modalità Sole" : "Modalità Dark"}
        className="h-9 w-9 md:h-10 md:w-10"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 md:h-5 md:w-5" />
        ) : (
          <Moon className="h-4 w-4 md:h-5 md:w-5" />
        )}
      </Button>
      <Button
        variant="outline"
        onClick={handleSignOut}
        className="h-9 md:h-10 px-2 md:px-4 hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-all duration-300"
      >
        <LogOut className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">{t("dashboard.signOut")}</span>
      </Button>
    </div>
  );
};
