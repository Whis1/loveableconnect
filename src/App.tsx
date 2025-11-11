import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AdBanner } from "./components/AdBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Explore from "./pages/Explore";
import Search from "./pages/Search";
import ProfileEdit from "./pages/ProfileEdit";
import Matches from "./pages/Matches";
import Likes from "./pages/Likes";
import Chat from "./pages/Chat";
import Messages from "./pages/Messages";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import TermsAndConditions from "./pages/TermsAndConditions";
import Credits from "./pages/Credits";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import PremiumSuccess from "./pages/PremiumSuccess";
import Support from "./pages/Support";
import AdminArrettu from "./pages/AdminArrettu";
import AdminProfiles from "./pages/AdminProfiles";
import AdminSupport from "./pages/AdminSupport";
import AdminCreateProfile from "./pages/AdminCreateProfile";
import Chats from "./pages/Chats";
import ChattorsLogin from "./pages/ChattorsLogin";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Ad Banner - visibile in tutte le pagine tranne /auth */}
          <AdBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/likes" element={<Likes />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/chat/:matchId" element={<Chat />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
            <Route path="/premium-success" element={<PremiumSuccess />} />
            <Route path="/support" element={<Support />} />
            <Route path="/adminarrettu" element={<AdminArrettu />} />
            <Route path="/admin/profiles" element={<AdminProfiles />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/create-profile" element={<AdminCreateProfile />} />
            <Route path="/chattors-login" element={<ChattorsLogin />} />
            <Route path="/chattors" element={<Chats />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
