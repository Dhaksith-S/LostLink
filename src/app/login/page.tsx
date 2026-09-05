"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { describeAuthError, useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!email.trim()) {
      setError("Enter your admin email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/reports");
    } catch (caught) {
      setError(describeAuthError(caught));
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-hero">
        <BrandMark size={56} />
        <h1 id="login-title">LostLink</h1>
        <p>Admin console · Campus lost &amp; found</p>
      </div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>Sign in</h2>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <span className="field-input">
            <Mail size={17} />
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="admin@campus.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              autoFocus
            />
          </span>
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <span className="field-input">
            <Lock size={17} />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </div>
        {error && (
          <div className="error-banner compact" role="alert">
            <AlertCircle size={17} />
            <p>{error}</p>
          </div>
        )}
        <button
          type="submit"
          className="button primary large"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner small" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Log in"
          )}
        </button>
        <p className="auth-hint">
          <ShieldCheck size={14} />
          Admin accounts are created in the Firebase console. There is no
          self-service signup.
        </p>
      </form>
    </section>
  );
}
