// src/App.jsx
import { useState } from "react";
import RolesPage from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Navbar";
import { ToastProvider } from "./toast/ToastContext";
import ToastContainer from "./toast/ToastContainer";

function App() {
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem("token"));
  const [selectedRole,  setSelectedRole]  = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setSelectedRole(null);
    setAuthenticated(false);
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
          : <RolesPage onRoleSelect={setSelectedRole} />
        }
      </div>
    </ToastProvider>
  );
}

export default App;