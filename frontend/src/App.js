import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Starfield from "@/components/Starfield";
import Navbar from "@/components/Navbar";
import AuthLanding from "@/pages/AuthLanding";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Bacheca from "@/pages/Bacheca";
import Matches from "@/pages/Matches";
import { Sparkles } from "lucide-react";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Sparkles className="h-8 w-8 text-[#E6C998] animate-pulse" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Sparkles className="h-8 w-8 text-[#E6C998] animate-pulse" />
      </div>
    );
  }
  if (user) return <Navigate to="/bacheca" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Synchronous detection of OAuth session_id in URL fragment
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><AuthLanding /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/bacheca" element={<ProtectedRoute><Bacheca /></ProtectedRoute>} />
        <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <Starfield />
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#0D1526",
                border: "1px solid #233045",
                color: "#F0F3F5",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
