import { useState } from "react";
import RolesPage from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import LoginPage from "./pages/LoginPage";

function App() {
  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const [selectedRole, setSelectedRole] = useState(null);

  // 1️⃣ Auth gate
  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  // 2️⃣ ATS navigation
  if (selectedRole) {
    return (
      <RoleDetailPage
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  return <RolesPage onRoleSelect={setSelectedRole} />;
}

export default App;
