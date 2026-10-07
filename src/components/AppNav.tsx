"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { useGitHubAuth } from "@/hooks/useGitHubAuth";
import { useLinkedRepository } from "@/hooks/useLinkedRepository";

function isEditorRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return pathname.startsWith("/resumes/") || pathname.startsWith("/github/edit");
}

export function AppNav() {
  const pathname = usePathname();
  const github = useGitHubAuth();
  const linkedRepo = useLinkedRepository();

  if (isEditorRoute(pathname)) {
    return null;
  }

  const resumesActive = pathname === "/";
  const githubActive = pathname === "/github" || pathname?.startsWith("/github/");

  const githubLabel = !github.configured
    ? "GitHub"
    : !github.connected
      ? "Connect GitHub"
      : linkedRepo
        ? linkedRepo.fullName
        : "Choose repo";

  return (
    <header className="border-b border-line bg-surface">
      <Container className="flex h-14 items-center gap-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-ink hover:text-accent"
        >
          Textume
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${
              resumesActive
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Resumes
          </Link>
        </nav>
        <div className="ml-auto">
          <Link
            href="/github"
            className={`inline-flex max-w-[14rem] items-center truncate rounded-full border px-3 py-1 text-xs font-medium ${
              githubActive
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
            }`}
            title={githubLabel}
          >
            {githubLabel}
          </Link>
        </div>
      </Container>
    </header>
  );
}
