import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Script from "next/script";
import { Moon, Sun, ArrowLeft, GitGraph } from "lucide-react";

declare global {
  interface Window {
    GraphQLVoyager?: {
      renderVoyager: (
        element: HTMLElement,
        options: {
          introspection: unknown;
          displayOptions?: Record<string, unknown>;
        }
      ) => void;
    };
  }
}

const MODES = [
  { key: "supergraph", label: "Supergraph" },
  { key: "assist", label: "Subgraph: ASSIST" },
  { key: "calm", label: "Subgraph: CALM" },
  { key: "easi", label: "Subgraph: EASi" },
  { key: "fpds", label: "Subgraph: FPDS" },
  { key: "usaspending", label: "Subgraph: USAspending" },
  { key: "petrified", label: "Subgraph: Petrified" },
];

export default function GraphQLVoyagerPage() {
  const [scriptReady, setScriptReady] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mode, setMode] = useState("supergraph");
  const voyagerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#1e1e2e] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <Head>
        <title>GraphQL Schema Viewer | Petrified Forest</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.css" />
      </Head>

      <Script
        src="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.standalone.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      {/* Header */}
      <header className={`flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 shadow-lg z-10 transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-b border-indigo-500/30' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-white hover:bg-white/20 border border-white/30">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <div className="text-white">
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
              <GitGraph className="w-5 h-5 opacity-80" />
              GraphQL Schema
            </h1>
            <p className="text-xs opacity-80 font-medium">
              {MODES.find(m => m.key === mode)?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              className={`appearance-none pl-4 pr-10 py-2 rounded-lg text-sm font-semibold outline-none transition-all shadow-inner border ${isDark ? 'bg-indigo-950/50 border-indigo-400/30 text-white focus:border-indigo-400' : 'bg-white border-transparent text-indigo-900 focus:border-purple-300'}`}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {MODES.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${isDark ? 'text-indigo-300' : 'text-indigo-400'}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          
          <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border text-white bg-white/10 border-white/20 hover:bg-white/20 shadow-sm">
            Open Editor
          </button>

          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg transition-colors border text-white bg-white/10 border-white/20 hover:bg-white/20 shadow-sm"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-indigo-100" />}
          </button>
        </div>
      </header>

      {/* Main Voyager Area */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Placeholder for Voyager since we don't have local schemas to fetch and feed to it. */}
        <div ref={voyagerRef} className="absolute inset-0 z-0 opacity-10 pointer-events-none flex items-center justify-center">
           {/* Decorative background grid */}
           <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className={`relative z-10 p-8 rounded-2xl max-w-lg text-center shadow-2xl border backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-700/50 shadow-black/50' : 'bg-white/90 border-slate-200 shadow-xl'}`}>
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
            <GitGraph className="w-10 h-10 text-white" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Voyager Simulation</h2>
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            In the fully hydrated environment, this pane runs <code>graphql-voyager</code> and fetches the <strong>{MODES.find(m => m.key === mode)?.label}</strong> SDL from the local server to render the interactive graph diagram.
          </p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            Graph Ready
          </div>
        </div>
      </main>
    </div>
  );
}
