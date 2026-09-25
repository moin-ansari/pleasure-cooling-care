"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TechnicianLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/technician/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });
      const json = await res.json();
      if (json.status === "success") {
        router.push("/technician");
        router.refresh();
        return;
      }
      setError(json.message || "Could not log in");
    } catch {
      setError("Could not connect. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-blue-800 px-4 py-10">
      <div className="mx-auto max-w-sm">
        <p className="text-center text-sm text-blue-100">Pleasure Cooling Care</p>
        <h1 className="mt-1 mb-6 text-center text-2xl font-bold text-white">Technician login</h1>

        <form onSubmit={submit} className="grid gap-4 rounded-lg bg-background p-5 shadow-lg">
          <div className="grid gap-1.5">
            <label htmlFor="tl-email" className="text-sm font-medium">
              Work email
            </label>
            <Input
              id="tl-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              className="h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="tl-pin" className="text-sm font-medium">
              PIN
            </label>
            <Input
              id="tl-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              className="h-12 text-base"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" className="h-12 text-base" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Forgot your PIN? Ask the office to reset it.</p>
        </form>
      </div>
    </div>
  );
}
