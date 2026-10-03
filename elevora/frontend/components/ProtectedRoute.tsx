"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "./Skeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" role="status" aria-label="Loading">
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    // Redirect is in flight; render nothing so protected content never flashes.
    return null;
  }

  return <>{children}</>;
}
