import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";
import { RouteTransitionOverlay } from "./RouteTransitionOverlay";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Explore from "@/pages/Explore";
import Search from "@/pages/Search";
import ProfileEdit from "@/pages/ProfileEdit";
import Matches from "@/pages/Matches";
import Likes from "@/pages/Likes";
import Chat from "@/pages/Chat";
import Messages from "@/pages/Messages";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import Credits from "@/pages/Credits";
import PurchaseSuccess from "@/pages/PurchaseSuccess";
import PremiumSuccess from "@/pages/PremiumSuccess";
import Support from "@/pages/Support";
import AuthCallback from "@/pages/AuthCallback";
import Sfida from "@/pages/Sfida";

// ⚡ Pagine RARE caricate solo quando si visitano (lazy): non finiscono nel
//    bundle iniziale che scaricano tutti gli utenti. Nessun cambiamento
//    visivo o di funzionamento: solo il primo accesso a queste pagine
//    scarica il loro pezzo di codice.
const TermsAndConditions = lazy(() => import("@/pages/TermsAndConditions"));
const AdminArrettu = lazy(() => import("@/pages/AdminArrettu"));
const AdminProfiles = lazy(() => import("@/pages/AdminProfiles"));
const AdminSupport = lazy(() => import("@/pages/AdminSupport"));
const AdminCreateProfile = lazy(() => import("@/pages/AdminCreateProfile"));
const Chats = lazy(() => import("@/pages/Chats"));
const ChattorsLogin = lazy(() => import("@/pages/ChattorsLogin"));
const DarkCrowPreview = lazy(() => import("@/pages/DarkCrowPreview"));

// Wrapper con Suspense per le pagine lazy (fallback nullo: la transizione di
// rotta gia' esistente copre il breve istante di caricamento).
const L = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>{children}</Suspense>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <>
      <RouteTransitionOverlay routeKey={location.pathname} />
      <AnimatePresence initial={false} mode="sync">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/explore" element={<PageTransition><Explore /></PageTransition>} />
          <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
          <Route path="/profile/edit" element={<PageTransition><ProfileEdit /></PageTransition>} />
          <Route path="/matches" element={<PageTransition><Matches /></PageTransition>} />
          <Route path="/likes" element={<PageTransition><Likes /></PageTransition>} />
          <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
          <Route path="/chat/:matchId" element={<PageTransition><Chat /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><L><TermsAndConditions /></L></PageTransition>} />
          <Route path="/credits" element={<PageTransition><Credits /></PageTransition>} />
          <Route path="/purchase-success" element={<PageTransition><PurchaseSuccess /></PageTransition>} />
          <Route path="/premium-success" element={<PageTransition><PremiumSuccess /></PageTransition>} />
          <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
          <Route path="/adminarrettu" element={<PageTransition><L><AdminArrettu /></L></PageTransition>} />
          <Route path="/admin/profiles" element={<PageTransition><L><AdminProfiles /></L></PageTransition>} />
          <Route path="/admin/support" element={<PageTransition><L><AdminSupport /></L></PageTransition>} />
          <Route path="/admin/create-profile" element={<PageTransition><L><AdminCreateProfile /></L></PageTransition>} />
          <Route path="/chattors-login" element={<PageTransition><L><ChattorsLogin /></L></PageTransition>} />
          <Route path="/chattors" element={<PageTransition><L><Chats /></L></PageTransition>} />
          <Route path="/auth/callback" element={<PageTransition><AuthCallback /></PageTransition>} />
          <Route path="/sfida" element={<PageTransition><Sfida /></PageTransition>} />
          <Route path="/dark-crow-preview" element={<PageTransition><L><DarkCrowPreview /></L></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </>
  );
};
