/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";

// 使用 React.lazy 延迟加载非核心页面
const Register = lazy(() => import("./pages/Register"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Welcome = lazy(() => import("./pages/Welcome"));
const Points = lazy(() => import("./pages/Points"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const SwitchCompanion = lazy(() => import("./pages/SwitchCompanion"));
const UploadMaterial = lazy(() => import("./pages/UploadMaterial"));
const GenerationProgress = lazy(() => import("./pages/GenerationProgress"));
const CatPlayer = lazy(() => import("./pages/CatPlayer"));
const CatHistory = lazy(() => import("./pages/CatHistory"));
const CreateCompanion = lazy(() => import("./pages/CreateCompanion"));
const EmptyCatPage = lazy(() => import("./pages/EmptyCatPage"));
const AccompanyMilestonePage = lazy(() => import("./pages/AccompanyMilestonePage"));
const AddFriendQR = lazy(() => import("./pages/AddFriendQR"));
const ScanFriend = lazy(() => import("./pages/ScanFriend"));

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { storage } from "./services/storage";

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#FFF5F0] flex flex-col items-center justify-center z-[9999]">
      <div className="relative">
        {/* 简单的猫爪加载动画或 Logo */}
        <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-4">
          <span className="text-2xl font-black text-[#FF9D76]">Miao</span>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-[#FF9D76] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-[#FF9D76] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-[#FF9D76] rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuthContext();
  const location = useLocation();

  if (isInitializing) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isInitializing, hasCat } = useAuthContext();
  const location = useLocation(); // Force re-render on route change

  if (isInitializing) {
    return <SplashScreen />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
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
          <Route path="/points" element={hasCat ? <Points /> : <Navigate to="/empty-cat" replace />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
  
        {/* Settings & Detail Routes (No Bottom Nav) */}
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/privacy-settings" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
        <Route path="/notification-settings" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/switch-companion" element={<ProtectedRoute><SwitchCompanion /></ProtectedRoute>} />
        <Route path="/add-friend-qr" element={<ProtectedRoute><AddFriendQR /></ProtectedRoute>} />
        <Route path="/scan-friend" element={<ProtectedRoute><ScanFriend /></ProtectedRoute>} />
  
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
