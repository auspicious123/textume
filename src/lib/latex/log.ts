export function extractLatexErrors(log: string): string[] {
  const lines = log.split("\n");
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("!")) {
      const block = [line.trim()];
      for (let j = i + 1; j < lines.length && j < i + 6; j++) {
        const next = lines[j].trim();
        if (!next) {
          break;
        }
        if (next.startsWith("!")) {
          break;
        }
        block.push(next);
      }
      errors.push(block.join("\n"));
    }
  }

  if (errors.length === 0 && /error/i.test(log)) {
    const errorLines = lines.filter((line) => /error/i.test(line)).slice(0, 8);
    if (errorLines.length > 0) {
      errors.push(errorLines.join("\n"));
    }
  }

  return [...new Set(errors)];
}
