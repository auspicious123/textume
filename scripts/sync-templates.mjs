import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ids = ["modern", "classic", "minimal"];
const labels = {
  modern: "Modern",
  classic: "Classic",
  minimal: "Minimal",
};
const descriptions = {
  modern: "Clean header and ruled sections.",
  classic: "Traditional centered layout with horizontal rules.",
  minimal: "Sparse single-column layout with little decoration.",
};

const entries = ids.map((id) => {
  const source = fs.readFileSync(
    path.join(root, "templates", id, "main.tex"),
    "utf8",
  );
  return {
    id,
    name: labels[id],
    description: descriptions[id],
    source,
  };
});

const outPath = path.join(root, "src/lib/templates/catalog.ts");
const contents = `import type { ResumeTemplate } from "@/types/template";

export const RESUME_TEMPLATES: readonly ResumeTemplate[] = ${JSON.stringify(
  entries,
  null,
  2,
)};

export function getTemplateById(id: string): ResumeTemplate | undefined {
  return RESUME_TEMPLATES.find((template) => template.id === id);
}

export const DEFAULT_TEMPLATE_ID = "modern";
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, contents);
console.log(`Synced ${entries.length} templates -> src/lib/templates/catalog.ts`);
