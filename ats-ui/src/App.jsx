// src/App.jsx
import { useState } from "react";
import RolesPage      from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import LoginPage      from "./pages/LoginPage";
import Navbar         from "./components/Navbar";
import { ToastProvider }  from "./toast/ToastContext";
import ToastContainer     from "./toast/ToastContainer";
import { fetchRole }      from "./api";

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem("token"));
  const [selectedRole,  setSelectedRole]  = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setSelectedRole(null);
    setAuthenticated(false);
  };

  // Show board immediately with list projection, then upgrade to full detail silently
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    fetchRole(role.id)
      .then(full => { if (full) setSelectedRole(full); })
      .catch(() => {});
  };

  if (!authenticated) {
    return (
      <ToastProvider>
        <ToastContainer />
        <LoginPage onLogin={() => setAuthenticated(true)} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ToastContainer />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar onLogout={handleLogout} />
        {selectedRole
          ? <RoleDetailPage role={selectedRole} onBack={() => setSelectedRole(null)} />
          : <RolesPage onRoleSelect={handleRoleSelect} />
        }
      </div>
    </ToastProvider>
  );
}