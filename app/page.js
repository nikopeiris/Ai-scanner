"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Terminal,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  Github,
  Sparkles,
  RefreshCw,
  Code2,
  FileCode,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/expressjs/express");
  const [scanning, setScanning] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeTab, setActiveTab] = useState("bugs"); // 'bugs' | 'fragile' | 'improvements'
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const terminalEndRef = useRef(null);

  // Auto-scroll terminal to latest log
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLogs]);

  const startScan = async (e) => {
    e?.preventDefault();
    if (!repoUrl.trim()) return;

    setScanning(true);
    setProgressLogs([]);
    setProgressPercent(5);
    setScanResult(null);
    setErrorMsg(null);

    // Setup SSE EventSource connection
    let eventSource;
    try {
      eventSource = new EventSource("http://localhost:5000/api/scan/stream");

      eventSource.addEventListener("connected", (e) => {
        const data = JSON.parse(e.data);
        setProgressLogs((prev) => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), message: "📡 SSE Stream Connected", type: "system" },
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
        // SSE closed or errored, close connection gracefully
        eventSource.close();
      };
    } catch (sseErr) {
      console.warn("SSE connection error:", sseErr);
    }

    try {
      const response = await fetch("http://localhost:5000/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header / Brand Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AI App Tester
              </h1>
              <p className="text-xs text-slate-400">Automated GitHub Code Quality & Bug Scanner</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Engine Online
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Input Header Section */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden shadow-2xl">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-md border border-cyan-800/50">
              <Github className="w-3.5 h-3.5" /> Repository Auditor
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Scan any GitHub repository for bugs, fragile logic, & improvements
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enter a public GitHub repository URL. Our backend fetches key source code files via GitHub REST API,
              analyzes logic paths using OpenAI, and streams live audit telemetry.
            </p>

            <form onSubmit={startScan} className="pt-2 flex flex-col sm:flex-row gap-3">
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
                    <Zap className="w-4 h-4 fill-white" /> Scan Repository
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

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

        {/* Live Terminal Log Section (SSE Streaming) */}
        {(scanning || progressLogs.length > 0) && (
          <section className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-medium text-slate-300">Live SSE Telemetry Stream</span>
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
        {scanResult && (
          <div className="space-y-6 animate-fadeIn">
            {/* Executive Summary Banner */}
            <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-900/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                  <FileCode className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">Executive Audit Summary</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      QA Ready
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{scanResult.summary}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="bg-slate-950/60 border border-rose-900/40 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs text-rose-400 font-medium">Critical Bugs</div>
                        <div className="text-2xl font-bold text-rose-200">{scanResult.criticalBugs?.length || 0}</div>
                      </div>
                      <ShieldAlert className="w-8 h-8 text-rose-500/40" />
                    </div>
                    <div className="bg-slate-950/60 border border-amber-900/40 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs text-amber-400 font-medium">Fragile Logic</div>
                        <div className="text-2xl font-bold text-amber-200">{scanResult.fragileLogic?.length || 0}</div>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-amber-500/40" />
                    </div>
                    <div className="bg-slate-950/60 border border-cyan-900/40 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-xs text-cyan-400 font-medium">Improvements</div>
                        <div className="text-2xl font-bold text-cyan-200">{scanResult.improvements?.length || 0}</div>
                      </div>
                      <Lightbulb className="w-8 h-8 text-cyan-500/40" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tabbed Navigation Bar */}
            <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4">
              <button
                onClick={() => setActiveTab("bugs")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "bugs"
                    ? "border-rose-500 text-rose-400 bg-rose-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Critical Bugs
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-950 text-rose-300 border border-rose-800">
                  {scanResult.criticalBugs?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("fragile")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "fragile"
                    ? "border-amber-500 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Fragile Logic & Edge Cases
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-950 text-amber-300 border border-amber-800">
                  {scanResult.fragileLogic?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("improvements")}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "improvements"
                    ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Suggested Improvements
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {scanResult.improvements?.length || 0}
                </span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-4">
              {/* Tab 1: Critical Bugs */}
              {activeTab === "bugs" && (
                <div className="space-y-4">
                  {(!scanResult.criticalBugs || scanResult.criticalBugs.length === 0) ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      No critical bugs detected in analyzed files!
                    </div>
                  ) : (
                    scanResult.criticalBugs.map((bug, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/60 border border-rose-900/40 rounded-xl p-6 space-y-3 hover:border-rose-700/60 transition-all shadow-lg"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                            <Code2 className="w-3.5 h-3.5" />
                            {bug.file}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 uppercase tracking-wider">
                            Critical
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-white text-base">{bug.issue}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            <strong className="text-rose-400 font-medium">Impact: </strong>
                            {bug.impact}
                          </p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm space-y-1">
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                            Recommended Fix:
                          </span>
                          <p className="text-slate-300 font-mono text-xs leading-relaxed">{bug.recommendedFix}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Fragile Logic */}
              {activeTab === "fragile" && (
                <div className="space-y-4">
                  {(!scanResult.fragileLogic || scanResult.fragileLogic.length === 0) ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      No fragile logic or unhandled edge cases detected.
                    </div>
                  ) : (
                    scanResult.fragileLogic.map((item, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/60 border border-amber-900/40 rounded-xl p-6 space-y-3 hover:border-amber-700/60 transition-all shadow-lg"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                            <Code2 className="w-3.5 h-3.5" />
                            {item.file}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 uppercase tracking-wider">
                            Warning
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-white text-base">{item.issue || item.risk}</h4>
                          <p className="text-sm text-slate-400 mt-1">
                            <strong className="text-amber-400 font-medium">Risk: </strong>
                            {item.risk}
                          </p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm space-y-1">
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
                            Trigger Scenario:
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed">{item.scenario}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Suggested Improvements */}
              {activeTab === "improvements" && (
                <div className="space-y-4">
                  {(!scanResult.improvements || scanResult.improvements.length === 0) ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      No further code quality improvements suggested.
                    </div>
                  ) : (
                    scanResult.improvements.map((item, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/60 border border-cyan-900/40 rounded-xl p-6 space-y-3 hover:border-cyan-700/60 transition-all shadow-lg"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            <Code2 className="w-3.5 h-3.5" />
                            {item.file}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">
                            {item.category || "Refactor"}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-semibold text-white text-base">{item.issue || item.suggestion}</h4>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm space-y-1">
                          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">
                            Actionable Suggestion:
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed">{item.suggestion}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        AI App Tester &bull; GitHub REST API & OpenAI Structured Outputs &bull; Built with Node.js & Next.js
      </footer>
    </div>
  );
}
