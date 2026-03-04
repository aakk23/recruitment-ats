// src/App.jsx
import { useState } from "react";
import RolesPage     from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import LoginPage     from "./pages/LoginPage";
import Navbar        from "./components/Navbar";
import { ToastProvider } from "./toast/ToastContext";
import ToastContainer    from "./toast/ToastContainer";
import { fetchRole }     from "./api";

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem("token"));
  const [selectedRole,  setSelectedRole]  = useState(null);
  const [roleLoading,   setRoleLoading]   = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setSelectedRole(null);
    setAuthenticated(false);
  };

  // Fetch full role detail on click — list response is a slim projection,
  // detail has description, skills, visibility, about_company, etc.
  const handleRoleSelect = (role) => {
    setSelectedRole(role);       // show board immediately with what we have
    setRoleLoading(true);
    fetchRole(role.id)
      .then((full) => { if (full) setSelectedRole(full); })
      .catch(() => { /* board still works with list projection */ })
      .finally(() => setRoleLoading(false));
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