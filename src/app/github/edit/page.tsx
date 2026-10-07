import { Suspense } from "react";
import { GitHubResumeEditor } from "@/components/GitHubResumeEditor";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export default function GitHubEditPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-12">
          <p className="text-sm text-ink-muted">Loading resume…</p>
        </Container>
      }
    >
      <GitHubResumeEditor />
    </Suspense>
  );
}
