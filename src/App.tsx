/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SwitchCompanion from "./pages/SwitchCompanion";
import UploadMaterial from "./pages/UploadMaterial";
import GenerationProgress from "./pages/GenerationProgress";
import CatPlayer from "./pages/CatPlayer";
import CatHistory from "./pages/CatHistory";
import CreateCompanion from "./pages/CreateCompanion";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Onboarding Routes */}
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/upload-material" element={<UploadMaterial />} />
        <Route path="/create-companion" element={<CreateCompanion />} />
        <Route path="/generation-progress" element={<GenerationProgress />} />
        <Route path="/cat-player/:id" element={<CatPlayer />} />
        <Route path="/cat-history" element={<CatHistory />} />

        {/* Main App Routes (with Bottom Nav) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/time-letters" element={<TimeLetters />} />
          <Route path="/points" element={<Points />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Settings & Detail Routes (No Bottom Nav) */}
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/privacy-settings" element={<PrivacySettings />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/switch-companion" element={<SwitchCompanion />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
