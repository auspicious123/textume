import { Suspense } from "react";
import { ResumeEditor } from "@/components/ResumeEditor";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

type ResumePageProps = {
  params: Promise<{ id: string }>;
};

async function ResumeEditorLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResumeEditor resumeId={id} />;
}

export default function ResumePage({ params }: ResumePageProps) {
  return (
    <Suspense
      fallback={
        <Container className="py-12">
          <p className="text-sm text-ink-muted">Loading resume…</p>
        </Container>
      }
    >
      <ResumeEditorLoader params={params} />
    </Suspense>
  );
}
