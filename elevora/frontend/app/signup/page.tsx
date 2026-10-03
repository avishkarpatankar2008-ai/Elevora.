"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/Alert";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { register, user, isLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up interview practice in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue hover:text-blue-soft">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters."
        />

        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
