/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import Home from "./pages/Home";
import Diary from "./pages/Diary";
import TimeLetters from "./pages/TimeLetters";
import Points from "./pages/Points";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import PrivacySettings from "./pages/PrivacySettings";
import Notifications from "./pages/Notifications";
import NotificationList from "./pages/NotificationList";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SwitchCompanion from "./pages/SwitchCompanion";
import UploadMaterial from "./pages/UploadMaterial";
import GenerationProgress from "./pages/GenerationProgress";
import CatPlayer from "./pages/CatPlayer";
import CatHistory from "./pages/CatHistory";
import CreateCompanion from "./pages/CreateCompanion";
import EmptyCatPage from "./pages/EmptyCatPage";
import AccompanyMilestonePage from "./pages/AccompanyMilestonePage";

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { storage } from "./services/storage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, hasCat } = useAuthContext();
  const location = useLocation(); // Force re-render on route change

  return (
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
        <Route path="/points" element={hasCat ? <Points /> : <Navigate to="/empty-cat" replace />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Settings & Detail Routes (No Bottom Nav) */}
      <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      <Route path="/privacy-settings" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationList /></ProtectedRoute>} />
      <Route path="/notification-settings" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/privacy-policy" element={<ProtectedRoute><PrivacyPolicy /></ProtectedRoute>} />
      <Route path="/switch-companion" element={<ProtectedRoute><SwitchCompanion /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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
