"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Terminal,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  FolderGit2,
  RefreshCw,
  Code2,
  Lock,
  Globe,
  LogOut,
  User,
  UploadCloud,
  X,
  Paperclip,
  FileCheck,
  PieChart,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Flame,
  Bug,
} from "lucide-react";
import { FaGithub as Github } from "react-icons/fa";

// Helper to clean raw code string artifacts (stripping array brackets, line wrapper quotes, escaped newlines, and double commas)
function cleanCodeString(rawCode) {
  if (!rawCode) return "";

  let text = "";

  if (Array.isArray(rawCode)) {
    text = rawCode.join("\n");
  } else if (typeof rawCode === "string") {
    let trimmed = rawCode.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          text = parsed.join("\n");
        } else {
          text = trimmed;
        }
      } catch (e) {
        text = trimmed.slice(1, -1);
      }
    } else {
      text = trimmed;
    }
  } else {
    text = String(rawCode);
  }

  // Clean double commas & escaped newlines
  text = text.replace(/,(\s*,)+/g, ",");
  text = text.replace(/\\n/g, "\n");

  // Process line by line to strip surrounding double quotes if present on stringified lines
  const lines = text.split("\n").map((line) => {
    let trimmedLine = line.trim();
    // If line is enclosed in quotes e.g. "const foo = 1", or "  method: \"POST\","
    if (trimmedLine.startsWith('"') && (trimmedLine.endsWith('"') || trimmedLine.endsWith('",'))) {
      let hasComma = trimmedLine.endsWith(",");
      let inner = hasComma ? trimmedLine.slice(0, -1) : trimmedLine;
      if (inner.startsWith('"') && inner.endsWith('"')) {
        inner = inner.slice(1, -1);
      }
      inner = inner.replace(/\\"/g, '"').replace(/\\'/g, "'");
      return inner + (hasComma ? "," : "");
    }
    return line;
  });

  return lines.join("\n").trim();
}

// Structured code block renderer with line numbers and syntax formatting
function FormattedCodeBlock({ code, colorTheme = "emerald" }) {
  const cleanedText = cleanCodeString(code);
  const lines = cleanedText.split("\n");

  const textColorClass =
    colorTheme === "rose"
      ? "text-rose-200"
      : colorTheme === "amber"
        ? "text-amber-200"
        : colorTheme === "cyan"
          ? "text-cyan-200"
          : "text-emerald-200";

  return (
    <div className="font-mono text-xs overflow-x-auto leading-relaxed bg-slate-950 p-4 rounded-b-xl border-t border-slate-800/80 max-h-96">
      <div className="table w-full border-collapse">
        {lines.map((lineText, idx) => (
          <div key={idx} className="table-row hover:bg-slate-900/40 transition-colors">
            <span className="table-cell text-right pr-4 select-none opacity-30 text-[11px] font-mono text-slate-400 w-8 border-r border-slate-800/50">
              {idx + 1}
            </span>
            <span className={`table-cell pl-4 whitespace-pre font-mono ${textColorClass}`}>
              {lineText || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/expressjs/express");
  const [scanning, setScanning] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [mainReportTab, setMainReportTab] = useState("overall"); // 'overall' | 'deep'
  const [deepCategory, setDeepCategory] = useState("criticalBugs"); // 'criticalBugs' | 'fragileLogic' | 'maintainabilitySuggestions'
  const [expandedItems, setExpandedItems] = useState({});
  const [copiedState, setCopiedState] = useState({});
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCopyCode = async (key, text) => {
    if (!text) return;
    const cleanText = cleanCodeString(text);
    let copied = false;

    try {
      if (navigator.clipboard && document.hasFocus()) {
        await navigator.clipboard.writeText(cleanText);
        copied = true;
      }
    } catch (err) {
      console.warn("Clipboard API error, using execCommand fallback:", err);
    }

    if (!copied) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = cleanText;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        copied = true;
      } catch (fallbackErr) {
        console.error("Fallback execCommand copy failed:", fallbackErr);
      }
    }

    setCopiedState((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedState((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // GitHub Auth & Repos state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userRepos, setUserRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchRepoQuery, setSearchRepoQuery] = useState("");

  // PDF Attachment state
  const [pdfFile, setPdfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const terminalEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handlePdfFileSelect = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Attached file must be a valid PDF document.");
      return;
    }
    setErrorMsg(null);
    setPdfFile(file);
  };

  const handlePdfDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Check stored auth session or URL code on load
  useEffect(() => {
    const storedToken = localStorage.getItem("gh_access_token");
    const storedUser = localStorage.getItem("gh_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      fetchUserRepos(storedToken);
    }

    // Check OAuth callback query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeCodeForToken(code);
    }
  }, []);

  // Auto-scroll terminal to latest log
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLogs]);

  const exchangeCodeForToken = async (code) => {
    try {
      const res = await fetch("http://localhost:5000/auth/github/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed GitHub OAuth login");

      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem("gh_access_token", data.accessToken);
      localStorage.setItem("gh_user", JSON.stringify(data.user));

      fetchUserRepos(data.accessToken);
    } catch (err) {
      setErrorMsg(`GitHub Authentication failed: ${err.message}`);
    }
  };

  const fetchUserRepos = async (authToken) => {
    setLoadingRepos(true);
    try {
      const res = await fetch("http://localhost:5000/api/user/repos", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.repos) {
        setUserRepos(data.repos);
      }
    } catch (err) {
      console.error("Error loading user repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = "http://localhost:5000/auth/github";
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setUserRepos([]);
    localStorage.removeItem("gh_access_token");
    localStorage.removeItem("gh_user");
  };

  const scanSpecificRepo = (repoObj) => {
    setRepoUrl(repoObj.htmlUrl);
  };

  const startScanFromForm = (e) => {
    e?.preventDefault();
    if (!repoUrl.trim()) return;
    runScan({ repoUrl: repoUrl.trim() });
  };

  const runScan = async ({ repoUrl, owner, repo }) => {
    setScanning(true);
    setProgressLogs([]);
    setProgressPercent(5);
    setScanResult(null);
    setErrorMsg(null);

    let eventSource;
    try {
      eventSource = new EventSource("http://localhost:5000/api/scan/stream");

      eventSource.addEventListener("connected", () => {
        setProgressLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), message: "📡 Server Connected", type: "system" },
        ]);
      });

      eventSource.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        setProgressLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: data.message,
            step: data.step,
            type: data.step === "WARN" ? "warning" : data.step === "ERROR" ? "error" : "info",
          },
        ]);

        if (data.progress) {
          setProgressPercent(data.progress);
        }
      });

      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch (sseErr) {
      console.warn("SSE connection error:", sseErr);
    }

    try {
      let pdfContextText = null;

      if (pdfFile) {
        setProgressLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: `📄 Parsing attached PDF '${pdfFile.name}'`,
            type: "system",
          },
        ]);

        const formData = new FormData();
        formData.append("file", pdfFile);

        const pdfRes = await fetch("/api/upload-pdf", {
          method: "POST",
          body: formData,
        });

        const pdfData = await pdfRes.json();

        if (!pdfRes.ok || !pdfData.success) {
          throw new Error(pdfData.error || "Failed to parse attached PDF document.");
        }

        pdfContextText = pdfData.text;

        setProgressLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: `✅ PDF text parsed successfully context`,
            type: "info",
          },
        ]);
      }

      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("http://localhost:5000/api/scan", {
        method: "POST",
        headers,
        body: JSON.stringify({ repoUrl, owner, repo, context: pdfContextText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze repository");
      }

      setScanResult(data.report);
      setProgressPercent(100);
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred during repository scan.");
    } finally {
      setScanning(false);
      if (eventSource) {
        eventSource.close();
      }
    }
  };

  const filteredUserRepos = userRepos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchRepoQuery.toLowerCase()) ||
      r.fullName.toLowerCase().includes(searchRepoQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white text-cyan-400 shadow-lg shadow-blue-500/30 animate-pulse-slow flex items-center justify-center">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Bugzy
              </h1>
              <p className="text-xs text-slate-400">Automate Your Testing</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.login} className="w-6 h-6 rounded-full" />
                  ) : (
                    <User className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className="text-xs font-medium text-slate-200">{user.login}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGitHubLogin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-md transition-all cursor-pointer"
              >
                <Github className="w-4 h-4" />
                Sign in with GitHub
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Authenticated Private Repos Dashboard */}
        {user && (
          <section className="bg-slate-900/60 border border-cyan-900/40 rounded-2xl p-6 backdrop-blur-sm space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Github className="w-4 h-4 text-cyan-400" />
                  Your GitHub Repositories (Public & Private)
                </h3>
                <p className="text-xs text-slate-400">
                  Select a repository to launch instant deep audit scan with private access credentials.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={searchRepoQuery}
                  onChange={(e) => setSearchRepoQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {loadingRepos ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Fetching your repository list...
              </div>
            ) : filteredUserRepos.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No repositories found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                {filteredUserRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => scanSpecificRepo(repo)}
                    disabled={scanning}
                    className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 hover:bg-slate-900/80 transition-all space-y-1.5 group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200 group-hover:text-cyan-400 truncate max-w-[180px]">
                        {repo.name}
                      </span>
                      {repo.private ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Globe className="w-2.5 h-2.5" /> Public
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{repo.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Input Header Section & PDF Attachment Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Header Section (Public URL Fallback) */}
          <section className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden shadow-2xl flex flex-col justify-between">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-md border border-cyan-800/50">
                <FolderGit2 className="w-3.5 h-3.5" /> Repo Bug Finder
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Scan any GitHub repository for bugs, fragile logic, & improvements
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enter a public GitHub repository URL or sign in with GitHub above to access private projects.
              </p>
            </div>

            <form onSubmit={startScanFromForm} className="pt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="url"
                  required
                  placeholder="https://github.com/owner/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={scanning}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={scanning || !repoUrl.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> Scan Repository
                  </>
                )}
              </button>
            </form>
          </section>

          {/* PDF Attachment Section (Right Side) */}
          <section className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden shadow-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950/60 px-3 py-1 rounded-md border border-purple-800/50">
                  <Paperclip className="w-3.5 h-3.5" /> PDF Reference Document
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                Attach Specification/Requirements or Business Rules
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rules you provide will be taken into consideration when running the test scan to make sure the logic is valid.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handlePdfFileSelect(e.target.files[0]);
                }
              }}
            />

            {!pdfFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handlePdfDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${isDragging
                  ? "border-cyan-500 bg-cyan-950/30"
                  : "border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/60 bg-slate-950/50"
                  }`}
              >
                <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    Click to attach or drag PDF here
                  </p>
                  <p className="text-[11px] text-slate-500">Supports .pdf files</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-100 truncate" title={pdfFile.name}>
                      {pdfFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">
                        {(pdfFile.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Ready for Scan
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  title="Remove attached PDF"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-all flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Error Alert Card */}
        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="font-semibold text-rose-200">Scan Failed: </strong>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Live Terminal Log Section (SSE Streaming) - Shown ONLY during scanning phase */}
        {(scanning && progressLogs.length > 0) && (
          <section className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-medium text-slate-300">Live Updates</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-cyan-400 font-semibold">{progressPercent}%</span>
                <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 font-mono text-xs max-h-56 overflow-y-auto space-y-2 bg-slate-950/90 leading-relaxed">
              {progressLogs.length === 0 ? (
                <p className="text-slate-600 italic">Initializing event stream pipeline...</p>
              ) : (
                progressLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-rose-400 font-semibold"
                          : log.type === "warning"
                            ? "text-amber-400 font-semibold"
                            : log.type === "system"
                              ? "text-cyan-400"
                              : "text-slate-300"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </section>
        )}

        {/* Dashboard Results View */}
        {scanResult && (() => {
          const bugs = scanResult.criticalBugs || [];
          const fragile = scanResult.fragileLogic || [];
          const maintainability = scanResult.maintainabilitySuggestions || scanResult.improvements || [];
          const totalIssues = bugs.length + fragile.length + maintainability.length;
          const numericRating = parseInt(scanResult.rating, 10) || (totalIssues === 0 ? 100 : Math.max(20, 100 - (bugs.length * 15 + fragile.length * 8 + maintainability.length * 4)));

          // Group issues by file for Heat Map
          const fileHeatMap = {};
          bugs.forEach((b) => {
            if (!fileHeatMap[b.file]) fileHeatMap[b.file] = { critical: 0, fragile: 0, maintainability: 0, total: 0 };
            fileHeatMap[b.file].critical++;
            fileHeatMap[b.file].total++;
          });
          fragile.forEach((f) => {
            if (!fileHeatMap[f.file]) fileHeatMap[f.file] = { critical: 0, fragile: 0, maintainability: 0, total: 0 };
            fileHeatMap[f.file].fragile++;
            fileHeatMap[f.file].total++;
          });
          maintainability.forEach((m) => {
            if (!fileHeatMap[m.file]) fileHeatMap[m.file] = { critical: 0, fragile: 0, maintainability: 0, total: 0 };
            fileHeatMap[m.file].maintainability++;
            fileHeatMap[m.file].total++;
          });

          // SVG Pie Chart dimensions
          const circumference = 282.74; // 2 * PI * 45
          const bugSlice = totalIssues > 0 ? (bugs.length / totalIssues) * circumference : 0;
          const fragileSlice = totalIssues > 0 ? (fragile.length / totalIssues) * circumference : 0;
          const maintainabilitySlice = totalIssues > 0 ? (maintainability.length / totalIssues) * circumference : 0;

          return (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Header Banner with Overall Rating */}
              <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-900/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        Executive Quality Report
                      </span>
                      <span className="text-xs text-slate-400">&bull; Overall Score: {numericRating}/100</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Repository Audit Summary</h3>
                    <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{scanResult.summary}</p>
                  </div>

                  {/* Rating Meter Badge */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-inner min-w-[180px]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Quality Score</span>
                    <div className="relative flex items-center justify-center">
                      <span
                        className={`text-4xl font-extrabold tracking-tight ${numericRating >= 80
                          ? "text-emerald-400"
                          : numericRating >= 60
                            ? "text-amber-400"
                            : "text-rose-400"
                          }`}
                      >
                        {numericRating}
                      </span>
                      <span className="text-xs font-bold text-slate-500 ml-0.5 mt-2">/100</span>
                    </div>
                    <span
                      className={`text-[11px] font-bold mt-1 px-2.5 py-0.5 rounded-full ${numericRating >= 80
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : numericRating >= 60
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                    >
                      {numericRating >= 80 ? "Good Quality" : numericRating >= 60 ? "Needs Review" : "Critical Action Required"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Main Report Dashboard Navigation Tabs */}
              <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4">
                <button
                  onClick={() => setMainReportTab("overall")}
                  className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${mainReportTab === "overall"
                    ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 shadow-sm"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                >
                  <PieChart className="w-4 h-4" />
                  Overall Insights
                </button>

                <button
                  onClick={() => setMainReportTab("deep")}
                  className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${mainReportTab === "deep"
                    ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 shadow-sm"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Deep Insights
                  <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {totalIssues}
                  </span>
                </button>
              </div>

              {/* TAB 1: OVERALL INSIGHTS */}
              {mainReportTab === "overall" && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900/60 border border-rose-900/40 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="space-y-1">
                        <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Critical Bugs</span>
                        <div className="text-3xl font-extrabold text-rose-200">{bugs.length}</div>
                        <p className="text-[11px] text-slate-400">High severity runtime crashes</p>
                      </div>
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-amber-900/40 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="space-y-1">
                        <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Fragile Logic</span>
                        <div className="text-3xl font-extrabold text-amber-200">{fragile.length}</div>
                        <p className="text-[11px] text-slate-400">Unbounded state & edge cases</p>
                      </div>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-cyan-900/40 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="space-y-1">
                        <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Maintainability</span>
                        <div className="text-3xl font-extrabold text-cyan-200">{maintainability.length}</div>
                        <p className="text-[11px] text-slate-400">Refactoring & quality ideas</p>
                      </div>
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                        <Lightbulb className="w-7 h-7" />
                      </div>
                    </div>
                  </div>

                  {/* Charts & Heatmap Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Donut / Pie Chart Card */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-cyan-400" />
                          Issue Distribution Breakdown
                        </h4>
                        <span className="text-xs text-slate-400">{totalIssues} Total Issues</span>
                      </div>

                      {totalIssues === 0 ? (
                        <div className="py-12 text-center space-y-2">
                          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                          <p className="text-sm font-semibold text-slate-200">Zero issues detected!</p>
                          <p className="text-xs text-slate-400">The repository passed all current quality standards.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
                          {/* SVG Donut Chart */}
                          <div className="relative w-40 h-40 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                              {/* Background Circle */}
                              <circle cx="60" cy="60" r="45" stroke="#1e293b" strokeWidth="16" fill="transparent" />

                              {/* Critical Bugs Slice (Rose) */}
                              {bugs.length > 0 && (
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="45"
                                  stroke="#f43f5e"
                                  strokeWidth="16"
                                  fill="transparent"
                                  strokeDasharray={`${bugSlice} ${circumference}`}
                                  strokeDashoffset="0"
                                />
                              )}

                              {/* Fragile Logic Slice (Amber) */}
                              {fragile.length > 0 && (
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="45"
                                  stroke="#f59e0b"
                                  strokeWidth="16"
                                  fill="transparent"
                                  strokeDasharray={`${fragileSlice} ${circumference}`}
                                  strokeDashoffset={`-${bugSlice}`}
                                />
                              )}

                              {/* Maintainability Slice (Cyan) */}
                              {maintainability.length > 0 && (
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="45"
                                  stroke="#06b6d4"
                                  strokeWidth="16"
                                  fill="transparent"
                                  strokeDasharray={`${maintainabilitySlice} ${circumference}`}
                                  strokeDashoffset={`-${bugSlice + fragileSlice}`}
                                />
                              )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                              <span className="text-2xl font-extrabold text-white">{totalIssues}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Findings</span>
                            </div>
                          </div>

                          {/* Chart Legend */}
                          <div className="space-y-3 flex-1 w-full">
                            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-rose-900/30">
                              <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                                <span className="text-xs font-semibold text-slate-200">Critical Bugs</span>
                              </div>
                              <span className="text-xs font-bold text-rose-300">
                                {bugs.length} ({Math.round((bugs.length / totalIssues) * 100)}%)
                              </span>
                            </div>

                            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-amber-900/30">
                              <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                                <span className="text-xs font-semibold text-slate-200">Fragile Logic</span>
                              </div>
                              <span className="text-xs font-bold text-amber-300">
                                {fragile.length} ({Math.round((fragile.length / totalIssues) * 100)}%)
                              </span>
                            </div>

                            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-cyan-900/30">
                              <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
                                <span className="text-xs font-semibold text-slate-200">Maintainability</span>
                              </div>
                              <span className="text-xs font-bold text-cyan-300">
                                {maintainability.length} ({Math.round((maintainability.length / totalIssues) * 100)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Repository File Heatmap Card */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-400" />
                          Codebase File Heat Map
                        </h4>
                        <span className="text-xs text-slate-400">{Object.keys(fileHeatMap).length} Affected Files</span>
                      </div>

                      {Object.keys(fileHeatMap).length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-500">
                          No file-level issue clusters recorded.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                          {Object.entries(fileHeatMap).map(([filePath, stats], idx) => {
                            const isHighRisk = stats.critical > 0;
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${isHighRisk
                                  ? "bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60"
                                  : stats.fragile > 0
                                    ? "bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60"
                                    : "bg-cyan-950/20 border-cyan-900/40 hover:border-cyan-700/60"
                                  }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Code2
                                    className={`w-4 h-4 flex-shrink-0 ${isHighRisk ? "text-rose-400" : stats.fragile > 0 ? "text-amber-400" : "text-cyan-400"
                                      }`}
                                  />
                                  <span className="text-xs font-mono font-medium text-slate-200 truncate" title={filePath}>
                                    {filePath}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {stats.critical > 0 && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      {stats.critical} Critical
                                    </span>
                                  )}
                                  {stats.fragile > 0 && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      {stats.fragile} Fragile
                                    </span>
                                  )}
                                  {stats.maintainability > 0 && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                      {stats.maintainability} Suggestion
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DEEP INSIGHTS */}
              {mainReportTab === "deep" && (
                <div className="space-y-6">
                  {/* Category Selection Sub-tabs */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setDeepCategory("criticalBugs")}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${deepCategory === "criticalBugs"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      Critical Bugs
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-800">
                        {bugs.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setDeepCategory("fragileLogic")}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${deepCategory === "fragileLogic"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Fragile Logic & Edge Cases
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                        {fragile.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setDeepCategory("maintainabilitySuggestions")}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${deepCategory === "maintainabilitySuggestions"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                    >
                      <Lightbulb className="w-4 h-4 text-cyan-400" />
                      Maintainability Suggestions
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {maintainability.length}
                      </span>
                    </button>
                  </div>

                  {/* Category Items List with Expandable Code Details */}
                  <div className="space-y-4">
                    {/* CRITICAL BUGS */}
                    {deepCategory === "criticalBugs" && (
                      <div className="space-y-4">
                        {bugs.length === 0 ? (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                            <p className="text-sm font-semibold text-slate-200">No critical bugs found!</p>
                            <p className="text-xs text-slate-500">All analyzed functions appear free of severe exceptions.</p>
                          </div>
                        ) : (
                          bugs.map((item, index) => {
                            const itemId = `bug-${index}`;
                            const isExpanded = expandedItems[itemId];
                            return (
                              <div
                                key={index}
                                className="bg-slate-900/60 border border-rose-900/40 rounded-2xl overflow-hidden hover:border-rose-700/60 transition-all shadow-xl"
                              >
                                {/* High Level Overview Header (Clickable) */}
                                <div
                                  onClick={() => toggleExpand(itemId)}
                                  className="p-5 sm:p-6 cursor-pointer select-none space-y-3 hover:bg-slate-900/80 transition-all"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                                      <Code2 className="w-3.5 h-3.5" />
                                      {item.file}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 uppercase tracking-wider">
                                        Critical Bug
                                      </span>
                                      <button
                                        type="button"
                                        className="p-1 text-slate-400 hover:text-white rounded-md bg-slate-950 border border-slate-800 transition-all"
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-bold text-white text-base sm:text-lg leading-snug">{item.issue}</h4>
                                    {item.impact && (
                                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        <strong className="text-rose-400 font-semibold">Impact: </strong>
                                        {item.impact}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 pt-1">
                                    <span>{isExpanded ? "Collapse code details" : "Click to view code & recommended fix"}</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </div>
                                </div>

                                {/* Expanded Code Details View */}
                                {isExpanded && (
                                  <div className="border-t border-slate-800/80 p-5 sm:p-6 bg-slate-950/90 space-y-4">
                                    {/* Broken Code Box */}
                                    {item.brokenCode && (
                                      <div className="bg-slate-950 rounded-xl border border-rose-900/50 overflow-hidden shadow-md space-y-2">
                                        <div className="bg-rose-950/40 px-4 py-2 border-b border-rose-900/40 flex items-center justify-between">
                                          <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="text-rose-500 font-extrabold">-</span> Broken Code / Current Implementation
                                          </span>
                                          <button
                                            onClick={() => handleCopyCode(`broken-${itemId}`, item.brokenCode)}
                                            className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800"
                                          >
                                            {copiedState[`broken-${itemId}`] ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" /> Copy
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <FormattedCodeBlock code={item.brokenCode} colorTheme="rose" />
                                      </div>
                                    )}

                                    {/* Recommended Fix Box */}
                                    {item.recommendedFix && (
                                      <div className="bg-slate-950 rounded-xl border border-emerald-900/50 overflow-hidden shadow-md space-y-2">
                                        <div className="bg-emerald-950/40 px-4 py-2 border-b border-emerald-900/40 flex items-center justify-between">
                                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="text-emerald-400 font-extrabold">+</span> Recommended Fix
                                          </span>
                                          <button
                                            onClick={() => handleCopyCode(`fix-${itemId}`, item.recommendedFix)}
                                            className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800"
                                          >
                                            {copiedState[`fix-${itemId}`] ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" /> Copy Fix
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <FormattedCodeBlock code={item.recommendedFix} colorTheme="emerald" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* FRAGILE LOGIC */}
                    {deepCategory === "fragileLogic" && (
                      <div className="space-y-4">
                        {fragile.length === 0 ? (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                            <p className="text-sm font-semibold text-slate-200">No fragile logic or unhandled edge cases!</p>
                          </div>
                        ) : (
                          fragile.map((item, index) => {
                            const itemId = `fragile-${index}`;
                            const isExpanded = expandedItems[itemId];
                            return (
                              <div
                                key={index}
                                className="bg-slate-900/60 border border-amber-900/40 rounded-2xl overflow-hidden hover:border-amber-700/60 transition-all shadow-xl"
                              >
                                {/* High Level Overview Header */}
                                <div
                                  onClick={() => toggleExpand(itemId)}
                                  className="p-5 sm:p-6 cursor-pointer select-none space-y-3 hover:bg-slate-900/80 transition-all"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                                      <Code2 className="w-3.5 h-3.5" />
                                      {item.file}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 uppercase tracking-wider">
                                        Fragile Logic
                                      </span>
                                      <button
                                        type="button"
                                        className="p-1 text-slate-400 hover:text-white rounded-md bg-slate-950 border border-slate-800 transition-all"
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-bold text-white text-base sm:text-lg leading-snug">
                                      {item.risk || item.issue}
                                    </h4>
                                    {item.scenario && (
                                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        <strong className="text-amber-400 font-semibold">Trigger Scenario: </strong>
                                        {item.scenario}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 pt-1">
                                    <span>{isExpanded ? "Collapse details" : "Click to view code & recommended fix"}</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </div>
                                </div>

                                {/* Expanded Code Details View */}
                                {isExpanded && (
                                  <div className="border-t border-slate-800/80 p-5 sm:p-6 bg-slate-950/90 space-y-4">
                                    {item.brokenCode && (
                                      <div className="bg-slate-950 rounded-xl border border-amber-900/50 overflow-hidden shadow-md space-y-2">
                                        <div className="bg-amber-950/40 px-4 py-2 border-b border-amber-900/40 flex items-center justify-between">
                                          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                            Fragile / Unbounded Code
                                          </span>
                                          <button
                                            onClick={() => handleCopyCode(`broken-${itemId}`, item.brokenCode)}
                                            className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800"
                                          >
                                            {copiedState[`broken-${itemId}`] ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" /> Copy
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <FormattedCodeBlock code={item.brokenCode} colorTheme="amber" />
                                      </div>
                                    )}

                                    {item.recommendedFix && (
                                      <div className="bg-slate-950 rounded-xl border border-emerald-900/50 overflow-hidden shadow-md space-y-2">
                                        <div className="bg-emerald-950/40 px-4 py-2 border-b border-emerald-900/40 flex items-center justify-between">
                                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            Recommended Robust Fix
                                          </span>
                                          <button
                                            onClick={() => handleCopyCode(`fix-${itemId}`, item.recommendedFix)}
                                            className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800"
                                          >
                                            {copiedState[`fix-${itemId}`] ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" /> Copy Fix
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <FormattedCodeBlock code={item.recommendedFix} colorTheme="emerald" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* MAINTAINABILITY SUGGESTIONS */}
                    {deepCategory === "maintainabilitySuggestions" && (
                      <div className="space-y-4">
                        {maintainability.length === 0 ? (
                          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                            <p className="text-sm font-semibold text-slate-200">No maintainability issues suggested!</p>
                          </div>
                        ) : (
                          maintainability.map((item, index) => {
                            const itemId = `maint-${index}`;
                            const isExpanded = expandedItems[itemId];
                            return (
                              <div
                                key={index}
                                className="bg-slate-900/60 border border-cyan-900/40 rounded-2xl overflow-hidden hover:border-cyan-700/60 transition-all shadow-xl"
                              >
                                {/* High Level Overview Header */}
                                <div
                                  onClick={() => toggleExpand(itemId)}
                                  className="p-5 sm:p-6 cursor-pointer select-none space-y-3 hover:bg-slate-900/80 transition-all"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                      <Code2 className="w-3.5 h-3.5" />
                                      {item.file}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">
                                        Maintainability
                                      </span>
                                      <button
                                        type="button"
                                        className="p-1 text-slate-400 hover:text-white rounded-md bg-slate-950 border border-slate-800 transition-all"
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-bold text-white text-base sm:text-lg leading-snug">
                                      {item.issue || item.suggestion}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 pt-1">
                                    <span>{isExpanded ? "Collapse details" : "Click to view code & recommended refactor"}</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </div>
                                </div>

                                {/* Expanded Code Details View */}
                                {isExpanded && (
                                  <div className="border-t border-slate-800/80 p-5 sm:p-6 bg-slate-950/90 space-y-4">
                                    {item.brokenCode && (
                                      <div className="bg-slate-950 rounded-xl border border-cyan-900/50 overflow-hidden shadow-md space-y-2">
                                        <div className="bg-cyan-950/40 px-4 py-2 border-b border-cyan-900/40 flex items-center justify-between">
                                          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                                            Existing Code Snippet
                                          </span>
                                          <button
                                            onClick={() => handleCopyCode(`broken-${itemId}`, item.brokenCode)}
                                            className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800"
                                          >
                                            {copiedState[`broken-${itemId}`] ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" /> Copy
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <FormattedCodeBlock code={item.brokenCode} colorTheme="cyan" />
                                      </div>
                                    )}

                                    {item.recommendedFix && (
                                      <div className="bg-slate-950 rounded-xl border border-emerald-900/50 overflow-hidden shadow-md space-y-2">
                                        <div className="bg-emerald-950/40 px-4 py-2 border-b border-emerald-900/40 flex items-center justify-between">
                                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            Refactored / Cleaned Code
                                          </span>
                                          <button
                                            onClick={() => handleCopyCode(`fix-${itemId}`, item.recommendedFix)}
                                            className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800"
                                          >
                                            {copiedState[`fix-${itemId}`] ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" /> Copy Fix
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <FormattedCodeBlock code={item.recommendedFix} colorTheme="emerald" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        @2026 Bugzy - AI Scanner. All rights reserved.
      </footer>
    </div>
  );
}
