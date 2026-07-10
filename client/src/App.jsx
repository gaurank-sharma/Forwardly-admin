import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Leads from "./pages/Leads.jsx";
import Script from "./pages/Script.jsx";
import Agents from "./pages/Agents.jsx";
import DayConfig from "./pages/DayConfig.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center text-sm text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === "admin" ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/script" element={<Script />} />
        <Route path="/agents" element={<AdminOnly><Agents /></AdminOnly>} />
        <Route path="/config" element={<AdminOnly><DayConfig /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
