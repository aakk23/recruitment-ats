import { useState } from "react";
import RolesPage from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import LoginPage from "./pages/LoginPage";
import { ToastProvider } from "./toast/ToastContext";
import ToastContainer from "./toast/ToastContainer";

function App() {
  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <ToastProvider>
      <ToastContainer />

      {/* 1️⃣ Auth gate */}
      {!authenticated && (
        <LoginPage onLogin={() => setAuthenticated(true)} />
      )}

      {/* 2️⃣ ATS navigation */}
      {authenticated && selectedRole && (
        <RoleDetailPage
          role={selectedRole}
          onBack={() => setSelectedRole(null)}
        />
      )}

      {authenticated && !selectedRole && (
        <RolesPage onRoleSelect={setSelectedRole} />
      )}
    </ToastProvider>
  );
}

export default App;
