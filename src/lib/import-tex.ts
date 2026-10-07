export function isTexFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".tex") || name.endsWith(".md");
}

export function defaultResumeNameFromFile(file: File): string {
  const base = file.name.replace(/\.(tex|md)$/i, "").trim();
  return base || "Imported Resume";
}

export async function readTexFile(file: File): Promise<string> {
  if (!isTexFile(file)) {
    throw new Error("Please choose a .tex or .md file containing LaTeX.");
  }

  const text = await file.text();
  if (
    file.name.toLowerCase().endsWith(".md") &&
    !/\\documentclass\b/.test(text)
  ) {
    throw new Error("Markdown file must contain a LaTeX \\documentclass.");
  }

  return text;
}
