Yes. I would give Cursor **small, sequential prompts**, not one giant prompt. That prevents it from overengineering the project.

One correction from my earlier answer: **don't assume SwiftLaTeX is the only or best compiler.** Browser-based LaTeX compilation is clearly feasible, and projects are using SwiftLaTeX/BusyTeX in-browser. SwiftLaTeX exposes a straightforward WASM API: load engine → write files → set main file → compile → receive PDF/log. [GitHub](https://github.com/wangyenshu/swiftlatex/blob/main/README.md?utm_source=chatgpt.com)

Below is the exact development plan I'd use.

---

# Phase 0: Project rules

Give Cursor this **first**.

```text
You are working on an open-source browser-based LaTeX Resume Manager.

Project goal:
Build a simple alternative to Overleaf focused specifically on resumes.

Core idea:
- Users can create multiple resumes.
- Users can write/edit raw LaTeX.
- Users can compile LaTeX to PDF entirely in the browser.
- Users can preview and download the generated PDF.
- Users can optionally connect a GitHub repository and load/save .tex files there.
- No backend should be required for the core functionality.

IMPORTANT PRODUCT PRINCIPLES:
1. Keep the project simple.
2. Do NOT build a full Overleaf clone.
3. Do NOT add a database.
4. Do NOT add a custom backend.
5. Do NOT add Redis, SQS, S3, PostgreSQL, authentication servers, etc.
6. Prefer browser/local storage and GitHub as persistence.
7. Do not add features that are not explicitly requested.
8. Keep the code modular and easy for open-source contributors to understand.
9. TypeScript throughout.
10. The application must work as a static/client-side application where possible.
11. Never send user's LaTeX to our own server for compilation.
12. LaTeX compilation should happen locally in the browser using a WASM-based LaTeX engine.

Before implementing anything:
- Inspect the existing repository.
- Do not overwrite existing code blindly.
- Explain the proposed file structure briefly.
- Then implement only the requested phase.

Do not move to future phases automatically.
```

---



# Phase 1: Basic Next.js application

Start with the shell only.

```text
Build Phase 1 of the LaTeX Resume Manager.

Tech stack:
- Next.js
- TypeScript
- Tailwind CSS
- App Router

Requirements:

1. Create a clean application shell.
2. Create a simple home page.
3. Home page should show:

   LaTeX Resume Manager

   A short description:
   "Create, edit and compile LaTeX resumes directly in your browser."

4. Add a "Create Resume" button.
5. Add an empty "My Resumes" section.
6. Create reusable UI components where appropriate.
7. Keep the UI minimal and professional.
8. Do not add authentication.
9. Do not add GitHub integration yet.
10. Do not add LaTeX compilation yet.
11. Do not add unnecessary animations.

Use client components only where required.

After implementation:
- Run lint.
- Run type checking.
- Run the production build.
- Fix any errors.
- Briefly explain what files were created/changed.
```

---



# Phase 2: Resume management

Now make the actual resume manager.

```text
Build Phase 2: local resume management.

The application must support unlimited local resumes.

Each resume should have:

- id
- name
- latex source
- createdAt
- updatedAt

Persistence:
- Use browser localStorage.
- Do not introduce a database.
- Do not introduce a backend.

Features:

1. Create a resume.
2. Give it a name.
3. Create it from a default LaTeX template.
4. Show all resumes on the home page.
5. Open a resume.
6. Rename a resume.
7. Delete a resume.
8. Duplicate a resume.
9. Automatically save changes to localStorage.
10. Show the last updated time.

Example resumes:

Backend Engineer
AI Engineer
Full Stack Engineer

The resume list should look clean and simple.

Important:
- Create a small resume storage abstraction such as:
  lib/resume-storage.ts
- Components should not directly manipulate localStorage everywhere.
- Handle localStorage safely because Next.js has server rendering.
- Do not add authentication.
- Do not add GitHub yet.

Run lint, typecheck and build after implementation.
```

---



# Phase 3: LaTeX editor

Now introduce the editor.

I'd use **CodeMirror 6** rather than Monaco for this project. It's lighter and more natural for a small browser-first editor. Existing browser LaTeX editors use CodeMirror for this type of experience. [GitHub](https://github.com/swimmingbrain/texbrain?utm_source=chatgpt.com)

```text
Build Phase 3: LaTeX editor.

Add a dedicated resume editor page.

Requirements:

1. Use CodeMirror 6.
2. Add LaTeX syntax highlighting.
3. Load the selected resume's latex source into the editor.
4. Editing the source must update the resume in localStorage.
5. Add Cmd/Ctrl + S behavior to save.
6. Add a clear Save button as well.
7. Show the resume name at the top.
8. Add a Back button to return to My Resumes.
9. Add a Compile button, but it should remain disabled/not functional until Phase 4.
10. Preserve the existing LaTeX exactly. Do not transform or format the user's source automatically.

Layout:

Desktop:

┌─────────────────────────────────────────────┐
│ Resume Name                  Save  Compile   │
├─────────────────────────────────────────────┤
│                                             │
│              LaTeX Editor                  │
│                                             │
│                                             │
└─────────────────────────────────────────────┘

Keep the UI minimal.

Do not implement PDF preview yet.

Run lint, typecheck and build.
```

---



# Phase 4: Prove browser LaTeX compilation

**This is the most important phase.**

Don't ask Cursor to build the whole editor + GitHub + compiler at once.

```text
Build Phase 4: browser-only LaTeX compilation.

Goal:
Compile a .tex document into a PDF entirely inside the browser.

Use a WASM-based LaTeX engine.

Investigate and use an appropriate browser-compatible engine, preferably SwiftLaTeX/pdfTeX initially.

Reference:
SwiftLaTeX exposes:
- loadEngine()
- writeMemFSFile()
- setEngineMainFile()
- compileLaTeX()

Official repository:
https://github.com/wangyenshu/swiftlatex

Requirements:

1. Do NOT create a backend.
2. Do NOT send LaTeX source to an API.
3. Load the WASM compiler client-side.
4. Create a small isolated compiler service/module such as:

   lib/latex/compiler.ts

5. The compiler should accept:
   - main.tex source
   - optional additional project files

6. It should return:
   - PDF bytes
   - compilation log
   - success/failure status

7. Add a simple test page/component that compiles:

   \documentclass{article}
   \begin{document}
   Hello World
   \end{document}

8. Display the resulting PDF in the browser.

9. Display useful compilation errors if compilation fails.

10. Do not implement GitHub integration yet.

11. Do not implement automatic compilation on every keystroke yet.

IMPORTANT:
Do not pretend compilation works if it does not.
If the chosen WASM package has browser/Next.js compatibility issues, investigate the actual package/API and fix the integration.

After implementation:
- Run the app.
- Verify compilation in a real browser environment if possible.
- Verify the PDF output.
- Document any limitations discovered.
```



### This phase is your technical checkpoint.

If Cursor gets this working, you've basically proven the core idea.

---



# Phase 5: PDF preview

```text
Build Phase 5: PDF preview.

Integrate the browser LaTeX compiler into the actual resume editor.

Requirements:

1. Clicking Compile should compile the current LaTeX source.
2. Show a loading state while compiling.
3. Show the generated PDF in the right side of the editor.
4. Show compilation errors in a small bottom panel.
5. Add:
   - Compile
   - Download PDF
6. Download should download the generated PDF locally.
7. Do not upload the PDF anywhere.
8. Do not add a backend.

Desktop layout:

┌────────────────────────┬───────────────────────┐
│                        │                       │
│      LaTeX Editor      │      PDF Preview      │
│                        │                       │
│                        │                       │
│                        │                       │
├────────────────────────┴───────────────────────┤
│ Compilation output                              │
└─────────────────────────────────────────────────┘

On smaller screens:
- Stack editor and preview vertically.

Do not compile on every keystroke yet.
Only compile when the user clicks Compile.

Run lint, typecheck and build.
```

---



# Phase 6: Auto-preview

Only after manual compilation works.

```text
Build Phase 6: optional automatic preview.

Add automatic compilation with a debounce.

Requirements:

1. Keep the Compile button.
2. Add automatic compilation after the user stops typing.
3. Debounce compilation by approximately 1.5 seconds.
4. Never start multiple compilations simultaneously.
5. If a compilation is already running, prevent race conditions.
6. The latest source must always win.
7. Show:
   - Compiling...
   - Compiled
   - Compilation failed

8. Do not compile on every keystroke.
9. Do not make automatic compilation mandatory.

Add a small toggle:

[✓] Auto compile

Default:
enabled on desktop.

Keep manual Compile available.
```

---



# Phase 7: Templates

Now make it useful for other people.

```text
Build Phase 7: resume templates.

Add a template system.

Create:

templates/
├── modern/
│   └── main.tex
├── classic/
│   └── main.tex
└── minimal/
    └── main.tex

Requirements:

1. Users can create a resume from a template.
2. Selecting a template creates a new independent resume.
3. After creation, the LaTeX can be edited freely.
4. Template changes must not affect existing resumes.
5. Do not create a complex template marketplace.
6. Templates are just local .tex files in the repository.

Create a simple template selection UI:

Choose a template

[ Modern ]
[ Classic ]
[ Minimal ]

Then:

Resume Name: __________

[Create Resume]

Do not add template accounts, APIs, or databases.
```

---



# Phase 8: Upload `.tex`

This gives users an easy way to bring their existing resume.

```text
Build Phase 8: import .tex files.

Add:

Import .tex

Requirements:

1. User can select a local .tex file.
2. Read it entirely in the browser.
3. Create a new local resume from the file.
4. Use the filename as the default resume name.
5. Allow the user to rename it.
6. Save it to localStorage.
7. Open it in the editor immediately.

Also support drag and drop if simple to implement.

Do not upload files anywhere.

Reject files that are clearly not .tex files.

Keep this feature simple.
```

---



# Phase 9: GitHub

**Only now** add GitHub.

```text
Build Phase 9: GitHub integration.

Goal:
Allow users to optionally use a GitHub repository as their resume source/storage.

Important:
GitHub integration is OPTIONAL.
The application must remain fully usable without GitHub.

User flow:

Connect GitHub
    ↓
Authorize GitHub
    ↓
Select repository
    ↓
Select .tex files
    ↓
Open resume
    ↓
Edit
    ↓
Save to GitHub

Requirements:

1. Use GitHub OAuth appropriately for a client-side application.
2. Do not create our own authentication system.
3. Request the minimum GitHub permissions necessary.
4. Never expose GitHub client secrets in browser code.
5. Never store GitHub tokens in plain localStorage.
6. Clearly explain permissions to the user.

Repository browser should:
- Show repositories the user can access.
- Allow selecting a repository.
- Find .tex files.
- Display files such as:

  resumes/
    backend.tex
    ai-engineer.tex
    fullstack.tex

7. Open selected .tex file in the editor.
8. Allow saving changes back to GitHub.
9. Create a commit when saving.
10. Allow the user to enter a commit message.

Example:

"Update backend resume"

Do not add GitHub Issues, Pull Requests, Actions, collaboration, or anything unrelated.

Keep the integration modular:

lib/github/
    auth.ts
    repositories.ts
    files.ts
```

---



# Phase 10: GitHub resume list

```text id="5q6myw"
Build Phase 10: GitHub resume management UI.

Add two sources to the application:

Local Resumes
GitHub Resumes

Example:

My Resumes

LOCAL
- Backend Engineer
- AI Engineer

GITHUB
shubham/latex-resume
- Backend Engineer
- AI Engineer
- Full Stack

Requirements:

1. Clearly distinguish local and GitHub resumes.
2. Opening a GitHub resume loads its current content.
3. Saving a GitHub resume commits the changed .tex file.
4. Do not automatically commit every keystroke.
5. GitHub save should be explicit.

Keep local resumes fully functional without GitHub.
```

---



# Phase 11: GitHub repo convention

This is where your original idea becomes really clean.

```text
Build Phase 11: GitHub resume repository convention.

Support a simple convention:

repository/
└── resumes/
    ├── backend.tex
    ├── ai-engineer.tex
    ├── fullstack.tex
    └── ats.tex

Requirements:

1. When connecting a repository, look for a /resumes directory.
2. If it doesn't exist, offer:

   Create /resumes

3. Discover .tex files inside /resumes.
4. Display filename as the resume name.
5. Allow opening and editing them.
6. Allow creating a new resume directly inside /resumes.
7. Allow deleting a resume with confirmation.
8. Allow renaming by changing the GitHub filename.

Do not support arbitrary deep project structures yet.

Keep this intentionally simple.
```

---



# Phase 12: README + open source polish

Finally:

```text
Build Phase 12: prepare the project for open source.

Create/update:

README.md
LICENSE
CONTRIBUTING.md
.env.example

README must explain:

1. What the project is.
2. Why it exists.
3. Main features.
4. Architecture.
5. How browser-side LaTeX compilation works.
6. Local development.
7. How to deploy to Vercel.
8. How GitHub integration works.
9. How to add a resume template.
10. Known limitations.

Architecture diagram:

User Browser
    |
    +-- Next.js
    |
    +-- CodeMirror
    |
    +-- WASM LaTeX Engine
    |
    +-- Local Storage
    |
    +-- GitHub API
    |
    +-- PDF Preview

Clearly state that core LaTeX compilation happens locally in the browser.

Do not add unnecessary infrastructure documentation.

Keep the README concise and developer-friendly.
```

---



# Final Phase: Quality pass

Give Cursor this after everything works:

```text
Perform a final engineering review of the project.

Do NOT add new features.

Review for:

- TypeScript errors
- React errors
- Next.js client/server boundary issues
- localStorage SSR issues
- memory leaks from WASM compiler
- repeated WASM initialization
- concurrent compilation race conditions
- GitHub token handling
- unnecessary dependencies
- unnecessary abstractions
- unnecessary API calls
- accessibility
- mobile layout
- error handling
- loading states
- PDF memory cleanup
- object URL cleanup
- security issues

Important:
Prefer deleting unnecessary code over adding abstractions.

Keep the project small.

Run:
- lint
- typecheck
- build

Fix all errors.

At the end provide:
1. Architecture summary
2. Important files
3. Dependencies
4. Known limitations
5. Commands to run locally
```

---



## The final product should be this simple

```text
                 ┌───────────────────┐
                 │   Resume Manager   │
                 └─────────┬─────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Local Resumes               GitHub Resumes
             │                           │
       localStorage                  GitHub API
             │                           │
             └─────────────┬─────────────┘
                           ↓
                    CodeMirror Editor
                           ↓
                    LaTeX Source
                           ↓
                  SwiftLaTeX / WASM
                           ↓
                         PDF
                           ↓
                  Browser Preview
```

**No backend. No database. No S3. No queues. No Redis.**

That's the right call for this project.

One additional thing: **put the compiler behind a small abstraction** like `LatexCompiler`. Don't scatter SwiftLaTeX calls throughout React components. If SwiftLaTeX turns out to be annoying or you later switch to BusyTeX/another WASM engine, you replace one implementation rather than rewriting the application. Browser-based projects are already demonstrating both SwiftLaTeX and BusyTeX approaches. [GitHub](https://github.com/texlyre/texlyre?utm_source=chatgpt.com)

And because you're making this public, I'd explicitly make **"local-first, no backend required"** part of the project's identity. That's much more interesting than "yet another Overleaf clone."