"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      await fetch("https://formsubmit.co/ajax/hi@kell.cx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, _subject: "Kell waitlist: " + email }),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
        ✓ You're on the list. We'll be in touch soon.
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-white mb-4">Get early access</h3>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="flex-1 px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-6 py-3 bg-white text-zinc-950 font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {status === "loading" ? "Joining..." : "Join waitlist"}
          </button>
        </div>
        <p className="text-xs text-zinc-600">Free during beta. No spam, just intel.</p>
        {status === "error" && (
          <p className="text-xs text-red-400 mt-2">Something went wrong. Please try again.</p>
        )}
      </form>
    </div>
  );
}
