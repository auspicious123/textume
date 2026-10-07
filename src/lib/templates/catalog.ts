import type { ResumeTemplate } from "@/types/template";

export const RESUME_TEMPLATES: readonly ResumeTemplate[] = [
  {
    "id": "modern",
    "name": "Modern",
    "description": "Clean header and ruled sections.",
    "source": "\\documentclass[11pt,a4paper]{article}\n\n\\usepackage{lmodern}\n\\usepackage[T1]{fontenc}\n\\usepackage[margin=0.7in]{geometry}\n\\usepackage[hidelinks]{hyperref}\n\n\\pagestyle{empty}\n\\setlength{\\parindent}{0pt}\n\\setlength{\\itemsep}{2pt}\n\\setlength{\\parsep}{0pt}\n\\setlength{\\topsep}{2pt}\n\\newcommand{\\sectionrule}{\\vspace{2pt}\\hrule height 0.6pt\\vspace{6pt}}\n\n\\begin{document}\n\n{\\LARGE\\bfseries Your Name}\\\\[6pt]\n{\\small City, Country $\\cdot$\n\\href{mailto:email@example.com}{email@example.com} $\\cdot$\n+1 234 567 8900}\\\\[2pt]\n{\\small\n\\href{https://github.com/}{github.com/you} $\\cdot$\n\\href{https://linkedin.com/in/}{linkedin.com/in/you}}\n\n\\vspace{10pt}\n\n{\\large\\bfseries Experience}\\sectionrule\n\\textbf{Senior Software Engineer} \\hfill Company Name\\\\\n\\textit{Month Year -- Present}\n\\begin{itemize}\n  \\item Shipped product features end-to-end with clear measurable impact.\n  \\item Improved system reliability and developer experience across the team.\n\\end{itemize}\n\n\\textbf{Software Engineer} \\hfill Previous Company\\\\\n\\textit{Month Year -- Month Year}\n\\begin{itemize}\n  \\item Built APIs and services used by thousands of users.\n\\end{itemize}\n\n{\\large\\bfseries Education}\\sectionrule\n\\textbf{B.S. Computer Science} \\hfill University Name\\\\\n\\textit{Month Year -- Month Year}\n\n{\\large\\bfseries Skills}\\sectionrule\n\\textbf{Languages:} TypeScript, Python, SQL\\\\\n\\textbf{Tools:} React, Node.js, Docker, Git, Linux\n\n\\end{document}\n"
  },
  {
    "id": "classic",
    "name": "Classic",
    "description": "Traditional centered layout with horizontal rules.",
    "source": "\\documentclass[11pt,a4paper]{article}\n\n\\usepackage{lmodern}\n\\usepackage[T1]{fontenc}\n\\usepackage[margin=1in]{geometry}\n\\usepackage[hidelinks]{hyperref}\n\n\\pagestyle{empty}\n\\setlength{\\parindent}{0pt}\n\\setlength{\\parskip}{4pt}\n\\setlength{\\itemsep}{1pt}\n\\setlength{\\parsep}{0pt}\n\\setlength{\\topsep}{2pt}\n\n\\begin{document}\n\n\\begin{center}\n  {\\Large\\bfseries YOUR NAME}\\\\[4pt]\n  \\hrule\n  \\vspace{6pt}\n  {\\small City, Country $\\cdot$\n  \\href{mailto:email@example.com}{email@example.com} $\\cdot$\n  +1 234 567 8900}\\\\[2pt]\n  {\\small\n  \\href{https://github.com/}{github.com/you} $\\cdot$\n  \\href{https://linkedin.com/in/}{linkedin.com/in/you}}\n  \\vspace{4pt}\n  \\hrule\n\\end{center}\n\n\\vspace{8pt}\n\n\\section*{Experience}\n\\textbf{Software Engineer}, Company Name \\hfill \\textit{Month Year -- Present}\n\\begin{itemize}\n  \\item Developed and maintained production applications.\n  \\item Collaborated with design and product to deliver polished features.\n\\end{itemize}\n\n\\textbf{Junior Developer}, Previous Company \\hfill \\textit{Month Year -- Month Year}\n\\begin{itemize}\n  \\item Supported releases, bug fixes, and documentation.\n\\end{itemize}\n\n\\section*{Education}\n\\textbf{B.S. Computer Science}, University Name \\hfill \\textit{Month Year -- Month Year}\n\n\\section*{Skills}\nProgramming: TypeScript, Python, SQL\\\\\nTools: Git, Linux, Docker\n\n\\end{document}\n"
  },
  {
    "id": "minimal",
    "name": "Minimal",
    "description": "Sparse single-column layout with little decoration.",
    "source": "\\documentclass[11pt,a4paper]{article}\n\n\\usepackage{lmodern}\n\\usepackage[T1]{fontenc}\n\\usepackage[margin=0.85in]{geometry}\n\\usepackage[hidelinks]{hyperref}\n\n\\pagestyle{empty}\n\\setlength{\\parindent}{0pt}\n\\setlength{\\parskip}{6pt}\n\\setlength{\\itemsep}{1pt}\n\\setlength{\\topsep}{1pt}\n\n\\begin{document}\n\n{\\LARGE Your Name}\n\n{\\small\nemail@example.com $\\cdot$\n+1 234 567 8900 $\\cdot$\n\\href{https://github.com/}{github.com/you}}\n\n\\vspace{4pt}\n\n\\textbf{Experience}\n\n\\textit{Role Title} --- Company Name --- Month Year -- Present\n\\begin{itemize}\n  \\item One strong accomplishment with outcome.\n  \\item Another concise bullet about your impact.\n\\end{itemize}\n\n\\textit{Role Title} --- Company Name --- Month Year -- Month Year\n\\begin{itemize}\n  \\item Brief description of work and results.\n\\end{itemize}\n\n\\textbf{Education}\n\n\\textit{Degree} --- University Name --- Month Year\n\n\\textbf{Skills}\n\nTypeScript, Python, SQL, Git, Docker\n\n\\end{document}\n"
  }
];

export function getTemplateById(id: string): ResumeTemplate | undefined {
  return RESUME_TEMPLATES.find((template) => template.id === id);
}

export const DEFAULT_TEMPLATE_ID = "modern";
