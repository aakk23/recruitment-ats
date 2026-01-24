import { useState } from "react";
import RolesPage from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";

function App() {
  const [selectedRole, setSelectedRole] = useState(null);

  if (selectedRole) {
    return (
      <RoleDetailPage
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  return (
    <RolesPage onRoleSelect={setSelectedRole} />
  );
}

export default App;