import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Moon, Sun, ArrowLeft, Download, ExternalLink } from "lucide-react";


const SCHEMAS = [
  { key: "supergraph", label: "Supergraph" },
  { key: "fpds", label: "Subgraph: FPDS" },
  { key: "usaspending", label: "Subgraph: USAspending" },
  { key: "assist", label: "Subgraph: ASSIST" },
  { key: "calm", label: "Subgraph: CALM" },
  { key: "easi", label: "Subgraph: EASi" },
  { key: "petrified", label: "Petrified (unified)" },
];

export default function PetrifiedSchemaViewer() {
  const [activeSchema, setActiveSchema] = useState("supergraph");
  const [isDark, setIsDark] = useState(true);

  // A small mock JSON snippet for visual effect
  const mockJson = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://example.com/schemas/${activeSchema}",
  "title": "${SCHEMAS.find(s => s.key === activeSchema)?.label || 'Schema'}",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The unique identifier"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" }
      }
    }
  },
  "required": ["id"]
}`;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <Head>
        <title>JSON Schema Viewer | Petrified Forest</title>
      </Head>

      {/* Header */}
      <header className={`flex-shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 shadow-md z-10 transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link href="/" className={`flex items-center gap-1.5 px-2 py-1 text-sm font-medium rounded-md transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-300'}`}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <div className="min-w-0">
            <h1 className={`font-semibold text-sm sm:text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>JSON Schema Viewer</h1>
            <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{SCHEMAS.find(s => s.key === activeSchema)?.label} — /data/schemas/{activeSchema}.schema.json</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <select 
              className={`appearance-none pl-3 pr-8 py-1.5 rounded-md text-sm font-medium outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-300 text-slate-800 focus:border-indigo-500'} border shadow-sm`}
              value={activeSchema}
              onChange={(e) => setActiveSchema(e.target.value)}
            >
              {SCHEMAS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          
          <button className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}>
            <ExternalLink className="w-4 h-4" />
            Open Validator
          </button>

          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-1.5 rounded-md transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-yellow-400' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Mock */}
        <aside className={`hidden md:flex flex-col w-64 border-r ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            Explorer
          </div>
          <div className="p-2 flex flex-col gap-1">
            {SCHEMAS.map(s => (
              <button 
                key={s.key}
                onClick={() => setActiveSchema(s.key)}
                className={`text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                  activeSchema === s.key 
                    ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700 font-medium')
                    : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200')
                }`}
              >
                {s.key}.schema.json
              </button>
            ))}
          </div>
        </aside>

        {/* Editor Mock */}
        <div className={`flex-1 flex flex-col relative ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}>
          <div className={`h-10 flex items-center px-4 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>
            <div className={`flex items-center gap-2 px-3 py-1 text-sm border-b-2 ${isDark ? 'border-indigo-500 text-indigo-400 bg-[#0d1117]' : 'border-indigo-600 text-indigo-700 bg-white'}`}>
              <span className="text-yellow-500">{'{ }'}</span>
              {activeSchema}.schema.json
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 md:p-6 font-mono text-sm leading-relaxed">
            <pre 
              key={activeSchema}
              
              
              
              className={`rounded-lg p-6 overflow-x-auto shadow-inner border ${isDark ? 'bg-[#0f172a] text-[#e2e8f0] border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-200'}`}
            >
              <code className="block whitespace-pre">
                {/* Simple syntax highlighting mock using regex replace just for vibe */}
                <div dangerouslySetInnerHTML={{__html: mockJson
                  .replace(/"(.*?)":/g, isDark ? '<span style="color: #7dd3fc">"$1"</span>:' : '<span style="color: #0284c7">"$1"</span>:')
                  .replace(/: "(.*?)"/g, isDark ? ': <span style="color: #a7f3d0">"$1"</span>' : ': <span style="color: #059669">"$1"</span>')
                  .replace(/([\[\]\{\}])/g, isDark ? '<span style="color: #f8fafc">$1</span>' : '<span style="color: #0f172a">$1</span>')
                }} />
              </code>
            </pre>
          </div>
        </div>
      </main>
      
      {/* Footer Mock */}
      <footer className={`h-7 flex items-center justify-between px-4 text-xs ${isDark ? 'bg-[#0d1117] border-t border-slate-800 text-slate-500' : 'bg-slate-100 border-t border-slate-200 text-slate-500'}`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Ready</span>
          <span>UTF-8</span>
          <span>JSON</span>
        </div>
        <div>
          Petrified Forest Viewer
        </div>
      </footer>
    </div>
  );
}
