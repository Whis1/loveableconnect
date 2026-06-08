import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Evento non standard di Chrome per l'installazione PWA.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * 📱 Pulsante "Installa LoveableConnect": appare solo quando il dispositivo
 * supporta l'installazione automatica della PWA (Android/Chrome) e l'app NON
 * e' gia' installata. Al clic apre la finestra di installazione nativa.
 * Su iPhone l'evento non esiste (Apple non lo permette), quindi il pulsante
 * non compare: li' l'installazione e' manuale da "Condividi -> Aggiungi a Home".
 */
export const InstallAppButton = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Se gira gia' come app installata (standalone), niente pulsante.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    // L'evento puo' essere scattato PRIMA che React montasse: lo recuperiamo
    // dalla cattura globale fatta in main.tsx.
    const early = (window as { deferredInstallPrompt?: BeforeInstallPromptEvent })
      .deferredInstallPrompt;
    if (early) setDeferred(early);

    const onInstallable = () =>
      setDeferred(
        (window as { deferredInstallPrompt?: BeforeInstallPromptEvent })
          .deferredInstallPrompt ?? null
      );
    const onBIP = (e: Event) => {
      e.preventDefault();
      (window as { deferredInstallPrompt?: BeforeInstallPromptEvent }).deferredInstallPrompt =
        e as BeforeInstallPromptEvent;
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      (window as { deferredInstallPrompt?: BeforeInstallPromptEvent | null }).deferredInstallPrompt =
        null;
    };

    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* L'utente ha chiuso la finestra: nessun problema. */
    } finally {
      setDeferred(null);
      (window as { deferredInstallPrompt?: BeforeInstallPromptEvent | null }).deferredInstallPrompt =
        null;
    }
  };

  return (
    <Button
      onClick={handleInstall}
      className="h-9 md:h-10 px-2.5 md:px-4 gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-md"
    >
      <span aria-hidden className="text-base leading-none">📱</span>
      <span className="hidden sm:inline">Installa LoveableConnect sul tuo dispositivo</span>
      <span className="sm:hidden font-semibold">Installa l'app</span>
    </Button>
  );
};
