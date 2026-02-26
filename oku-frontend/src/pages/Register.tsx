import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ts/ThemeContext";
import api from "../services/api";
import "./auth.css";

interface ApiError {
  response?: { data?: { error?: string } };
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/register", { name, email, password });
      navigate("/login");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.error ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = theme === "dark" ? "/white_logo.png" : "/dark_logo.png";

  return (
    <div className="auth-shell">

      {/* ── Header ── */}
      <header className="auth-header">
        <div className="auth-header__brand">
          <img src={logoSrc} alt="OKU logo" className="auth-header__logo" />
          <span className="auth-header__name">ОКУ</span>
        </div>
        <button
          className="auth-header__theme"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {/* ── Main ── */}
      <main className="auth-main">
        <div className="auth-card">

          {/* Logo inside card */}
          <div className="auth-logo-wrap">
            <img src={logoSrc} alt="OKU" className="auth-logo" />
            <span className="auth-logo-name">ОКУ</span>
          </div>

          <p className="auth-eyebrow">GET STARTED</p>
          <h1 className="auth-heading">Create Account</h1>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-name">
                NAME
              </label>
              <input
                id="reg-name"
                className="auth-field__input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-email">
                EMAIL
              </label>
              <input
                id="reg-email"
                className="auth-field__input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-password">
                PASSWORD
              </label>
              <input
                id="reg-password"
                className="auth-field__input"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "REGISTER"}
            </button>
          </form>

          <p className="auth-footnote">
            Already have an account?{" "}
            <Link className="auth-footnote__link" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}