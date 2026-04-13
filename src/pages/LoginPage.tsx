import { useState } from "react";

export function LoginPage({
  defaultUsername,
  onSubmit,
  busy,
}: {
  defaultUsername: string;
  onSubmit: (username: string, password: string) => Promise<void>;
  busy: boolean;
}) {
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState("");

  return (
    <div className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">Admin Login</p>
        <h1>Gateway Grok Control</h1>
        <p className="muted">
          Dang nhap dashboard operator. Client API van di bang API key o backend.
        </p>
        <div className="form-grid single-column">
          <label>
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>
        <div className="action-row">
          <button
            className="action-button"
            type="button"
            disabled={busy || !username.trim() || !password}
            onClick={() => void onSubmit(username, password)}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </section>
    </div>
  );
}
