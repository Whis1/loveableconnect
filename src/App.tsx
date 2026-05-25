import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AdBanner } from "./components/AdBanner";
import { AnimatedRoutes } from "./components/AnimatedRoutes";
import { useApplyGamePendingPenalty } from "./hooks/useApplyGamePendingPenalty";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuti - i dati restano freschi
      gcTime: 10 * 60 * 1000, // 10 minuti - cache mantiene i dati
      refetchOnWindowFocus: false, // Non ricarica quando si torna alla finestra
      refetchOnMount: false, // Non ricarica al mount se i dati sono freschi
      retry: 1, // Riprova solo 1 volta in caso di errore
    },
  },
});

// Wrapper interno per chiamare hook che richiedono context (BrowserRouter, ecc.)
// e per applicare le pending penalty di abbandono partita all'avvio dell'app.
const AppShell = () => {
  useApplyGamePendingPenalty();
  return (
    <>
      <AdBanner />
      <AnimatedRoutes />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
