import React, { useState } from "react";
import { supabase } from "../storage/supabaseClient";
import { useSupabaseAuth } from "./useSupabaseAuth";
import "./AuthGate.css";

// Gates the app behind a Supabase magic-link login. Children render only when a
// session exists; otherwise the user sees a single email box that requests a
// one-time sign-in link.
export default function AuthGate({ children }) {
  const { session, loading } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState("");

  const sendMagicLink = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message || "Could not send the sign-in link.");
      return;
    }

    setStatus("sent");
  };

  if (loading) {
    return <div className="auth-screen">Loading your workspace…</div>;
  }

  if (session) {
    return children;
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="auth-kicker">Personal finance workspace</p>
        <h1>Sign in</h1>
        <p className="auth-lead">
          Enter your email and we will send you a one-time sign-in link. No
          password needed.
        </p>

        {status === "sent" ? (
          <p className="auth-sent" role="status">
            Check your inbox for a sign-in link, then return here.
          </p>
        ) : (
          <form className="auth-form" onSubmit={sendMagicLink}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <button
              className="primary-action"
              type="submit"
              disabled={status === "sending" || !email.trim()}
            >
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}

        {status === "error" ? (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
