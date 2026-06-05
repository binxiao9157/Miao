/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

function lazyRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('Chunk load failed, retrying...', error);
      await new Promise(r => setTimeout(r, 1000));
      return importFn();
    }
  });
}

const MainLayout = lazyRetry(() => import("./components/layout/MainLayout"));
const Login = lazyRetry(() => import("./pages/Login"));
const Register = lazyRetry(() => import("./pages/Register"));
const TermsOfService = lazyRetry(() => import("./pages/TermsOfService"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const Welcome = lazyRetry(() => import("./pages/Welcome"));
const EditProfile = lazyRetry(() => import("./pages/EditProfile"));
const ChangePassword = lazyRetry(() => import("./pages/ChangePassword"));
const Notifications = lazyRetry(() => import("./pages/Notifications"));
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"));
const PrivacySettings = lazyRetry(() => import("./pages/PrivacySettings"));
const SwitchCompanion = lazyRetry(() => import("./pages/SwitchCompanion"));
const UploadMaterial = lazyRetry(() => import("./pages/UploadMaterial"));
const GenerationProgress = lazyRetry(() => import("./pages/GenerationProgress"));
const CatPlayer = lazyRetry(() => import("./pages/CatPlayer"));
const CatHistory = lazyRetry(() => import("./pages/CatHistory"));
const CreateCompanion = lazyRetry(() => import("./pages/CreateCompanion"));
const EmptyCatPage = lazyRetry(() => import("./pages/EmptyCatPage"));
const AccompanyMilestonePage = lazyRetry(() => import("./pages/AccompanyMilestonePage"));
const AddFriendQR = lazyRetry(() => import("./pages/AddFriendQR"));
const ScanFriend = lazyRetry(() => import("./pages/ScanFriend"));
const SetNickname = lazyRetry(() => import("./pages/SetNickname"));
const Download = lazyRetry(() => import("./pages/Download"));
const Feedback = lazyRetry(() => import("./pages/Feedback"));
const AdminSettings = lazyRetry(() => import("./pages/AdminSettings"));
const FriendManage = lazyRetry(() => import("./pages/FriendManage"));

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import SplashScreen from "./components/SplashScreen";


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthContext();
  const location = useLocation();

  if (isInitializing) return null; // AppRoutes handles SplashScreen

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Handle miao://friend?invite=CODE deep links.
 * - If the page is loaded with a miao:// URL (e.g. OS-level protocol handler),
 *   parse the invite code and redirect to /scan-friend?invite=CODE.
 * - Also register the web-based protocol handler when supported.
 */
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);

    // Case 1:_loaded via miao:// protocol (OS routes the custom scheme to the PWA)
    if (url.protocol === "miao:") {
      const code = url.searchParams.get("invite") || url.searchParams.get("code");
      if (code) {
        navigate(`/scan-friend?invite=${encodeURIComponent(code)}`, { replace: true });
      }
      return;
    }

    // Case 2: web fallback — /join-friend?invite=CODE or ?deep_link=miao://...
    const deepLink = url.searchParams.get("deep_link");
    if (deepLink && deepLink.startsWith("miao://friend")) {
      try {
        const parsed = new URL(deepLink);
        const code = parsed.searchParams.get("invite") || parsed.searchParams.get("code");
        if (code) {
          navigate(`/scan-friend?invite=${encodeURIComponent(code)}`, { replace: true });
        }
      } catch {
        // invalid deep link, ignore
      }
    }

    // Register protocol handler for miao:// scheme (Chrome 96+ on HTTPS)
    if ("registerProtocolHandler" in navigator) {
      try {
        (navigator as any).registerProtocolHandler(
          "miao",
          `${window.location.origin}/join-friend?deep_link=%s`
        );
      } catch {
        // Not supported or not in secure context, ignore
      }
    }
  }, [navigate]);

  return null;
}

function AppRoutes() {
  const { isAuthenticated, isInitializing, hasCat } = useAuthContext();
  const location = useLocation(); // Force re-render on route change

  if (isInitializing) return null;

  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#FFF9F5] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
      <DeepLinkHandler />
      <Routes location={location}>
        {/* Auth Routes */}
        <Route path="/login" element={
          isAuthenticated ? (
            hasCat ? <Navigate to="/" replace /> : <Navigate to="/empty-cat" replace />
          ) : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? (
            hasCat ? <Navigate to="/" replace /> : <Navigate to="/empty-cat" replace />
          ) : <Register />
        } />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/download" element={<Download />} />
        <Route path="/reset-password" element={
          isAuthenticated ? (
            hasCat ? <Navigate to="/" replace /> : <Navigate to="/empty-cat" replace />
          ) : <ResetPassword />
        } />
        
        {/* Onboarding & Special Pages (No Bottom Nav) */}
        <Route path="/empty-cat" element={<ProtectedRoute>{!hasCat ? <EmptyCatPage /> : <Navigate to="/" replace />}</ProtectedRoute>} />
        <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
        <Route path="/upload-material" element={<ProtectedRoute><UploadMaterial /></ProtectedRoute>} />
        <Route path="/create-companion" element={<ProtectedRoute><CreateCompanion /></ProtectedRoute>} />
        <Route path="/generation-progress" element={<ProtectedRoute><GenerationProgress /></ProtectedRoute>} />
        <Route path="/cat-player/:id" element={<ProtectedRoute><CatPlayer /></ProtectedRoute>} />
        <Route path="/cat-history" element={<ProtectedRoute><CatHistory /></ProtectedRoute>} />
        <Route path="/accompany-milestone" element={<ProtectedRoute><AccompanyMilestonePage /></ProtectedRoute>} />
  
        {/* Main App Routes (with Bottom Nav) */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={hasCat ? <></> : <Navigate to="/empty-cat" replace />} />
          <Route path="/diary" element={hasCat ? <></> : <Navigate to="/empty-cat" replace />} />
          <Route path="/time-letters" element={hasCat ? <></> : <Navigate to="/empty-cat" replace />} />
          <Route path="/notifications" element={hasCat ? <></> : <Navigate to="/empty-cat" replace />} />
          <Route path="/points" element={hasCat ? <></> : <Navigate to="/empty-cat" replace />} />
          <Route path="/profile" element={hasCat ? <></> : <Navigate to="/empty-cat" replace />} />
        </Route>
  
        {/* Settings & Detail Routes (No Bottom Nav) */}
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/notification-settings" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy-settings" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
        <Route path="/set-nickname" element={<ProtectedRoute><SetNickname /></ProtectedRoute>} />
        <Route path="/switch-companion" element={<ProtectedRoute><SwitchCompanion /></ProtectedRoute>} />
        <Route path="/add-friend-qr" element={<ProtectedRoute><AddFriendQR /></ProtectedRoute>} />
        <Route path="/scan-friend" element={<ProtectedRoute><ScanFriend /></ProtectedRoute>} />
        <Route path="/join-friend" element={<ProtectedRoute><ScanFriend /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/admin-settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
        <Route path="/friends-manage" element={<ProtectedRoute><FriendManage /></ProtectedRoute>} />
  
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SplashScreen />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
