import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { AppProvider, useApp } from "./components/AppContext";
import LoginPage from "./pages/Login";
import EventsList from "./pages/EventsList";
import EventCreate from "./pages/EventCreate";
import ParticipantsList from "./pages/ParticipantsList";
import ParticipantDetail from "./pages/ParticipantDetail";
import FormEdit from "./pages/FormEdit";
import EventSettings from "./pages/EventSettings";
import { MailOutbox } from "./pages/MailOutbox";
import MailCompose from "./pages/MailCompose";
import MailTemplates from "./pages/MailTemplates";
import { Managers, Admins } from "./pages/People";
import { PublicForm, PublicSuccess, PublicFail } from "./pages/PublicForm";
import Profile from "./pages/Profile";

function ProtectedRoute({ children }) {
  const { user, ready } = useApp();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <span className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/form/:id" element={<PublicForm />} />
      <Route path="/form/:id/success" element={<PublicSuccess />} />
      <Route path="/form/:id/fail" element={<PublicFail />} />
      <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* App routes with layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/events" replace />} />
                <Route path="/events" element={<EventsList />} />
                <Route path="/events/create" element={<EventCreate />} />
                <Route path="/events/:eventId/participants" element={<ParticipantsList />} />
                <Route path="/participant/:id" element={<ParticipantDetail />} />
                <Route path="/events/:eventId/form/edit" element={<FormEdit />} />
                <Route path="/events/:eventId/edit" element={<EventSettings />} />
                <Route path="/events/:eventId/mail" element={<MailOutbox />} />
                <Route path="/events/:eventId/mail/create" element={<MailCompose />} />
                <Route path="/events/:eventId/mail-templates" element={<MailTemplates />} />
                <Route path="/events/:eventId/managers" element={<Managers />} />
                <Route path="/admins" element={<Admins />} />
                <Route path="*" element={<Navigate to="/events" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
