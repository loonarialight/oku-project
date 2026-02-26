import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { AuthContext } from "./context/ts/AuthContext";

import { ThemeProvider } from "./context/ThemeContext";

import { UserProvider } from "./context/UserContext";
import { useUser } from "./context/useUser";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Learn from "./pages/Learn";
import Topics from "./pages/Topics";
import Lesson from "./pages/Lesson";
import Practice from "./pages/Practice";

/* ── Private route guard ── */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useContext(AuthContext);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/* ── Fetch user stats once on mount after login ── */
function AppRoutes() {
  const { token } = useContext(AuthContext);
  const { fetchStats } = useUser();

  useEffect(() => {
    if (token) void fetchStats();
  }, [token, fetchStats]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      <Route path="/learn" element={<PrivateRoute><Learn /></PrivateRoute>} />
      <Route path="/learn/:grade/:subject" element={<PrivateRoute><Topics /></PrivateRoute>} />
      <Route path="/learn/topic/:id" element={<PrivateRoute><Lesson /></PrivateRoute>} />
      <Route path="/learn/topic/:id/practice" element={<PrivateRoute><Practice /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}