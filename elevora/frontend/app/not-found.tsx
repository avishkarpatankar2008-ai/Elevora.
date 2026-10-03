import Link from "next/link";
import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-20 sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Page not found</h1>
      <p className="text-sm leading-6 text-ink-600">
        That link doesn&apos;t exist (or it belonged to a deleted interview). Head back to your
        dashboard to pick up where you left off.
      </p>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Home</Button>
        </Link>
      </div>
    </div>
  );
}
