const UNSUPPORTED_PACKAGES = [
  "parskip",
  "enumitem",
  "titlesec",
  "fontawesome5",
  "fontawesome",
  "ragged2e",
  "xcolor",
  "url",
] as const;

function stripPackage(source: string, name: string): string {
  return source.replace(
    new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{${name}\\}\\s*`, "g"),
    "",
  );
}

function stripBalancedCommand(source: string, command: string): string {
  const needle = `\\${command}`;
  let result = source;
  let index = result.indexOf(needle);

  while (index !== -1) {
    let cursor = index + needle.length;
    while (cursor < result.length && /\s/.test(result[cursor])) {
      cursor += 1;
    }

    if (result[cursor] === "[") {
      cursor = skipBracket(result, cursor, "[", "]");
      while (cursor < result.length && /\s/.test(result[cursor])) {
        cursor += 1;
      }
    }

    if (result[cursor] === "{") {
      cursor = skipBracket(result, cursor, "{", "}");
      while (cursor < result.length && /\s/.test(result[cursor])) {
        cursor += 1;
      }
    }

    while (result[cursor] === "[" || result[cursor] === "{") {
      const open = result[cursor];
      const close = open === "[" ? "]" : "}";
      cursor = skipBracket(result, cursor, open, close);
      while (cursor < result.length && /\s/.test(result[cursor])) {
        cursor += 1;
      }
    }

    result = `${result.slice(0, index)}${result.slice(cursor)}`;
    index = result.indexOf(needle);
  }

  return result;
}

function skipBracket(
  source: string,
  start: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return source.length;
}

export function migrateLatexForBasicTexLive(source: string): string {
  let next = source;

  for (const name of UNSUPPORTED_PACKAGES) {
    next = stripPackage(next, name);
  }

  next = stripBalancedCommand(next, "titleformat");
  next = stripBalancedCommand(next, "titlespacing");
  next = stripBalancedCommand(next, "setlist");

  next = next
    .replace(/\\begin\{itemize\}\[[^\]]*\]/g, "\\begin{itemize}")
    .replace(/\\justifying\b/g, "")
    .replace(/\\faGithub\b\s*/g, "")
    .replace(/\\faLinkedin\b\s*/g, "")
    .replace(/\\faEnvelope\b\s*/g, "")
    .replace(/\\faMobile\b\s*/g, "")
    .replace(/\\fa[A-Za-z]+\b\s*/g, "");

  const needsLatinModern =
    !/\\usepackage(?:\[[^\]]*\])?\{lmodern\}/.test(next) &&
    (/\\usepackage(?:\[[^\]]*\])?\{hyperref\}/.test(next) ||
      /\\usepackage(?:\[[^\]]*\])?\{geometry\}/.test(next));

  if (needsLatinModern) {
    next = next.replace(
      /(\\documentclass(?:\[[^\]]*\])?\{[^}]+\}\s*)/,
      "$1\n\\usepackage{lmodern}\n\\usepackage[T1]{fontenc}\n",
    );
  }

  if (!/\\setlength\{\\parindent\}/.test(next)) {
    next = next.replace(
      /(\\begin\{document\})/,
      [
        "\\setlength{\\parindent}{0pt}",
        "\\setlength{\\parskip}{2pt}",
        "\\setlength{\\itemsep}{1.2pt}",
        "\\setlength{\\parsep}{0pt}",
        "\\setlength{\\topsep}{2pt}",
        "$1",
      ].join("\n"),
    );
  }

  return next;
}
