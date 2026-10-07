%-----------------------------------------------------------------------
% Final Single-Page Resume for Shubham Kumar
%-----------------------------------------------------------------------

\documentclass[a4paper,10pt]{article}

% PACKAGES
\usepackage{url}
\usepackage{parskip}
\usepackage{graphicx}
\usepackage[dvipsnames]{xcolor}
\usepackage[top=0.65in, bottom=0.45in, left=0.5in, right=0.5in]{geometry}
\usepackage{ragged2e}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage[unicode, draft=false]{hyperref}
\usepackage{fontawesome5}
\usepackage{multicol}

\setlength{\columnsep}{0cm}

% FORMATTING
\titleformat{\section}
  {\Large\scshape\raggedright}
  {}
  {0em}
  {}
  [\titlerule]

\titlespacing{\section}{0pt}{4pt}{3pt}

\sloppy
\hyphenpenalty=500
\exhyphenpenalty=500

\setlist[itemize]{
    leftmargin=1.2em,
    itemsep=1.2pt,
    parsep=0pt,
    partopsep=0pt,
    label=\textbullet
}

% JOB ENTRY
\newcommand{\jobentry}[3]{%
  \noindent\textbf{#1}\hfill\small #2\\[-1pt]%
  \noindent\begin{minipage}[t]{\linewidth}\justifying%
    \begin{itemize}%
      #3%
    \end{itemize}%
  \end{minipage}\vspace{2pt}%
}

% PROJECT ENTRY
\newcommand{\projectentry}[3]{%
  \noindent\textbf{#1}\hfill\small #2\\[-1pt]%
  \noindent\begin{minipage}[t]{\linewidth}\justifying%
    \begin{itemize}%
      #3%
    \end{itemize}%
  \end{minipage}\vspace{2pt}%
}

% BEGIN DOCUMENT
\begin{document}
\pagestyle{empty}

%-----------------------------------------------------------------------
% HEADER
%-----------------------------------------------------------------------

\begin{center}
  {\huge\bfseries Shubham Kumar}\\[2pt]

  \small
  Software Engineer \textbar{} Backend \& Distributed Systems \textbar{} AI/LLM Engineering\\[3pt]

  \href{https://github.com/auspicious123}{\faGithub\ \texttt{auspicious123}}
  \quad
  \href{https://linkedin.com/in/shubhamk60/}{\faLinkedin\ \texttt{shubhamk60}}
  \quad
  \href{mailto:auspicious2602@gmail.com}{\faEnvelope\ \texttt{auspicious2602@gmail.com}}
  \quad
  \href{tel:+918434914802}{\faMobile\ \texttt{+91-8434914802}}
\end{center}

\vspace{3pt}

%-----------------------------------------------------------------------
% TECHNICAL SKILLS
%-----------------------------------------------------------------------

\section{Technical Skills}
\vspace{1pt}

\begin{itemize}[leftmargin=1.2em, itemsep=1.2pt]

    \item \textbf{Languages:}
    TypeScript, Python, Go, C++.

    \item \textbf{Backend \& Systems:}
    Node.js, FastAPI, gRPC, Microservices, REST APIs, WebSockets, Redis, BullMQ.

    \item \textbf{AI \& LLM:}
    RAG, LangChain, LangGraph, OpenAI, Azure OpenAI, Vector Databases.

    \item \textbf{Cloud \& DevOps:}
    AWS, Azure, Docker, CI/CD, Nginx.

    \item \textbf{Databases \& Storage:}
    PostgreSQL, MongoDB, MySQL, Cloudflare R2, Supabase.

    \item \textbf{Frontend:}
    React.js, Next.js, React Native, Tailwind CSS, Redux.

\end{itemize}

%-----------------------------------------------------------------------
% WORK EXPERIENCE
%-----------------------------------------------------------------------

\section{Work Experience}

\jobentry
{Genpact - Software Engineer \textbar{} \normalfont\textit{Node.js, FastAPI, Python, Redis, Azure, AI/LLM}}
{Mar 2025 -- Present}
{
    \item Spearheaded a 4-person team to architect an RBAC-secured Agentic RAG platform for multi-format document ingestion, including a sandboxed execution environment for secure data querying.

    \item Engineered and scaled \textbf{KnowGauge}, an SSO-integrated GenAI assessment platform serving \textbf{10K+ live users}; optimized Azure App Services, \textbf{Redis}, and \textbf{BullMQ} to support asynchronous LLM workloads and peak loads of \textbf{6K requests/min}.

    \item Developed \textbf{FastAPI microservices} using \textbf{Azure OpenAI} for RAG pipelines, integrating asynchronous task processing with Redis and BullMQ for high-volume concurrent LLM requests.

    \item Architected an automated billing validation pipeline using \textbf{Microsoft Graph API} to process email payloads, extract data from complex purchase orders, and integrate results with enterprise ERP systems.

    \item Designed and deployed autonomous AI workflows using Nova Act and GPT-based systems while owning CI/CD deployments and system design across multiple concurrent AI initiatives.
}

\jobentry
{Triedge Platform Services - Software Development Engineer \textbar{} \normalfont\textit{Node.js, MongoDB, MySQL, WebSockets, BullMQ}}
{Jan 2024 -- Feb 2025}
{
    \item Developed a resilient \textbf{WebSocket} microservice with token-based socket authentication and a \textbf{1GB chunked-upload pipeline} using Node.js streams to reduce memory overhead and avoid loading files entirely into RAM.

    \item Spearheaded an end-to-end diagnostic booking pipeline integrating \textbf{Razorpay} and the \textbf{WhatsApp API}, implementing webhook-driven workflows for automated invoicing and event notifications.

    \item Built fault-tolerant asynchronous job processing with \textbf{BullMQ}, custom retry policies, and exponential backoff for reliable execution of high-volume background tasks.

    \item Integrated enterprise APIs including \textbf{Samplify} to synchronize data across platforms and maintain reliable cross-system workflows.
}

\jobentry
{Triedge Platform Services - Software Development Engineer Intern \textbar{} \normalfont\textit{React, React Native, Node.js, MongoDB, AWS}}
{Apr 2023 -- Dec 2023}
{
    \item Bootstrapped a cross-platform health application integrating Bluetooth hardware and wearable telemetry sources including \textbf{Google Fit} and \textbf{Fitbit}.

    \item Built a Multi-Patient Management System and Coupon Engine with rate limiting, structured error logging, and optimized MongoDB queries, reducing API latency from \textbf{900ms to 180ms}.
}

\jobentry
{NIT Nagaland Administration - Full Stack Developer \textbar{} \normalfont\textit{React, Node.js, MySQL}}
{Jun 2022 -- Apr 2023}
{
    \item Delivered an RBAC-based institute portal supporting multi-tier leave workflows and secure PDF generation, deployed for day-to-day institutional operations.

    \item Built data-obfuscation and billing workflows for real-time headcounts and institute/mess financial processing.
}

%-----------------------------------------------------------------------
% PROJECTS
%-----------------------------------------------------------------------

\section{Projects}

\projectentry
{Multi-Tenant Insurance SaaS Platform \textbar{} \normalfont\textit{Next.js, Node.js, Supabase, Cloudflare R2}}
{Jan 2025}
{
    \item Architected a multi-tenant SaaS platform with \textbf{Supabase Row Level Security (RLS)} for tenant-level data isolation and a \textbf{Cloudflare R2} document pipeline optimized for high-volume retrieval.
}

\projectentry
{Lawbot -- AI Legal Assistant \textbar{} \normalfont\textit{TypeScript, OpenAI, Pinecone, RAG}}
{Sep 2023}
{
    \item Built the core \textbf{RAG pipeline} for contract generation and analysis using TypeScript, OpenAI, and Pinecone Vector DB.

    \item Implemented \textbf{Parent Document Retrieval} to map smaller query chunks to comprehensive parent documents and preserve context during retrieval.
}

%-----------------------------------------------------------------------
% EDUCATION
%-----------------------------------------------------------------------

\section{Education}

\noindent
\textbf{National Institute of Technology, Nagaland}
\hfill
2020 -- 2024
\\
Bachelor of Technology - Electronics and Instrumentation Engineering
\hfill
\textbf{CGPA: 9.01/10}

\end{document}