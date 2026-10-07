"use client";

import dynamic from "next/dynamic";

export const PdfPreviewLazy = dynamic(
  () =>
    import("@/components/PdfPreview").then((module) => module.PdfPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-64 items-center justify-center bg-pdf-workspace text-sm text-white/55">
        Loading preview…
      </div>
    ),
  },
);
