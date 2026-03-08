// src/App.jsx
import { useState, useEffect } from "react";
import RolesPage      from "./pages/RolesPage";
import RoleDetailPage from "./pages/RoleDetailPage";
import SettingsPage   from "./pages/SettingsPage";
import CandidateProfilePage from "./pages/CandidateProfilePage";
import CandidatesPage from "./pages/CandidatesPage";
import LoginPage      from "./pages/LoginPage";
import Navbar         from "./components/Navbar";
import ChangePasswordPanel from "./components/ChangePasswordPanel";
import { ToastProvider }  from "./toast/ToastContext";
import ToastContainer     from "./toast/ToastContainer";
import { fetchRole, fetchMe, logout, scheduleRefresh, cancelRefresh } from "./api";
import { AuthContext } from "./useAuth";
import { hasPermission } from "./permissions";



export default function App() {
  const [authenticated, setAuthenticated] =useState(null);;
  const [user,          setUser]          = useState(null);
  const [selectedRole,  setSelectedRole]  = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidateProfileBackPage, setCandidateProfileBackPage] = useState("roles");
  const [page,          setPage]          = useState("roles"); // "roles" | "settings" | "candidateProfile"
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);

  // Fetch the logged-in user once after authentication so every page
  // (Navbar, SettingsPage) shares the same object without extra round-trips.
  useEffect(() => {
    // if (!authenticated) { setUser(null); return; }
    fetchMe()
      .then(me => { 
        if (me) {
          setUser(me); 
          setAuthenticated(true);
          scheduleRefresh(); 
        }
        else setAuthenticated(false);
      })
      .catch(() => setAuthenticated(false));
  }, []);

 // Listen for 401s from any apiFetch call
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setAuthenticated(false);
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  const handleLogout = async () => {
    cancelRefresh();        // stop any pending refresh attempts
    await logout();            // clears the cookie server-side
    setUser(null);
    setSelectedRole(null);
    setSelectedCandidateId(null);
    setCandidateProfileBackPage("roles");
    setPage("roles");
    setAuthenticated(false);
  };
  if (authenticated === null) return null; 

  // Show board immediately with list projection, then upgrade to full detail silently
  const handleRoleSelect = (role) => {
    setPage("roles");
    setSelectedCandidateId(null);
    setSelectedRole(role);
    fetchRole(role.id)
      .then(full => { if (full) setSelectedRole(full); })
      .catch(() => {});
  };

  const openCandidateProfile = (candidateId, backPage = "roles") => {
    if (!candidateId) return;
    setSelectedCandidateId(candidateId);
    setCandidateProfileBackPage(backPage);
    setPage("candidateProfile");
  };

  const canViewCandidates = hasPermission(user, "candidate:view");
  const navPage = page === "candidateProfile" ? candidateProfileBackPage : page;

  if (!authenticated) {
    return (
      <ToastProvider>
        <ToastContainer />
        <LoginPage
          onLogin={async () => {
            const me = await fetchMe();
            if (!me) {
              setAuthenticated(false);
              return;
            }
            setUser(me);
            setAuthenticated(true);
            scheduleRefresh();
          }}
        />
      </ToastProvider>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <ToastProvider>
        <ToastContainer />
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Navbar
            user={user}
            onLogout={handleLogout}
            onSettings={() => { setSelectedRole(null); setSelectedCandidateId(null); setPage("settings"); }}
            onChangePassword={() => setShowPasswordPanel(true)}
            onJobs={() => { setSelectedRole(null); setSelectedCandidateId(null); setPage("roles"); }}
            onCandidates={() => { setSelectedRole(null); setSelectedCandidateId(null); setPage("candidates"); }}
            activePage={navPage}
            showCandidates={canViewCandidates}
          />
  
          {page === "settings" && (
            <SettingsPage user={user} onBack={() => setPage("roles")} />
          )}
  
          {page === "roles" && selectedRole && (
            <RoleDetailPage
              role={selectedRole}
              onBack={() => setSelectedRole(null)}
              onOpenCandidateProfile={openCandidateProfile}
            />
          )}
  
          {page === "roles" && !selectedRole && (
            <RolesPage onRoleSelect={handleRoleSelect} />
          )}

          {page === "candidates" && canViewCandidates && (
            <CandidatesPage onCandidateSelect={(candidateId) => openCandidateProfile(candidateId, "candidates")} />
          )}

          {page === "candidateProfile" && selectedCandidateId && (
            <CandidateProfilePage
              candidateId={selectedCandidateId}
              onBack={() => { setSelectedCandidateId(null); setPage(candidateProfileBackPage); }}
            />
          )}
          <ChangePasswordPanel
            open={showPasswordPanel}
            onClose={() => setShowPasswordPanel(false)}
          />
        </div>
      </ToastProvider>
    </AuthContext.Provider>
  );
}
