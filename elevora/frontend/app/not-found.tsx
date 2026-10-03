import { Button, ButtonLink } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-20 sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">This page doesn&apos;t exist</h1>
      <p className="text-sm leading-6 text-ink-soft">
        The link may be old, or it pointed at an interview that has since been deleted. Your own
        interviews are all in your dashboard.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        <ButtonLink href="/" variant="secondary">Back home</ButtonLink>
      </div>
    </div>
  );
}
