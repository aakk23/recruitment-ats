import { useState } from "react";
import { login } from "../api";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ 
      padding: "40px", 
      maxWidth: "360px", 
      margin: "0 auto",
      minHeight: "100vh",
      background: "#1e1e1e",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: "8px" }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: "8px" }}
      />

      {error && (
        <div style={{ color: "red", fontSize: "12px" }}>
          {error}
        </div>
      )}

      <button
        disabled={loading}
        onClick={() => {
          setLoading(true);
          setError(null);

          login(email, password)
            .then((res) => {
              localStorage.setItem("token", res.access_token);
              onLogin();
            })
            .catch(() => {
              setError("Invalid email or password");
            })
            .finally(() => setLoading(false));
        }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}

export default LoginPage;
