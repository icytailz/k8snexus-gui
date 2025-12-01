import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Terminal, X } from 'lucide-react';
import { VimEditor } from './VimEditor';

/* ==================================================================================================================
   MODULE: TERMINAL PANEL
   Description: The bottom drawer containing shell simulation and Vim integration.
   ================================================================================================================== */

export const TerminalPanel = ({
  isOpen,
  onClose,
  history,
  onCommand,
  isVimMode,
  vimFile,
  onVimSave,
  onVimExit
}: {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  onCommand: (cmd: string) => void;
  isVimMode: boolean;
  vimFile: any;
  onVimSave: (content: string) => void;
  onVimExit: () => void;
}) => {
  const [input, setInput] = useState('');
  const [activeShell, setActiveShell] = useState('Local Shell (zsh)');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onCommand(input);
      setInput('');
    }
  };

  return (
    <div className={`bg-[#0d1117] border-t border-slate-800 transition-all duration-300 flex flex-col ${isOpen ? 'h-[400px]' : 'h-0'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800">
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2">
            <Terminal size={12} /> Console
          </span>
          <div className="h-4 w-[1px] bg-slate-700"></div>
          <select 
            value={activeShell}
            onChange={(e) => setActiveShell(e.target.value)}
            className="bg-transparent text-xs text-blue-400 font-mono outline-none cursor-pointer hover:text-blue-300"
            disabled={isVimMode}
          >
            <option>Local Shell (zsh)</option>
            <option>Cluster Shell (kubectl)</option>
            <option>Node Debug (sh)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-slate-500 hover:text-white"><ChevronDown size={14} /></button>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={14} /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative font-mono text-sm">
        {isVimMode && vimFile ? (
          <VimEditor 
            initialContent={vimFile.content} 
            filename={vimFile.name}
            onSave={onVimSave}
            onExit={onVimExit}
          />
        ) : (
          <div className="h-full p-4 overflow-y-auto text-slate-300" ref={scrollRef} onClick={() => document.getElementById('term-input')?.focus()}>
            {history.map((line, i) => <div key={i} className="whitespace-pre-wrap mb-1">{line}</div>)}
            <div className="flex items-center gap-2 text-emerald-400 mt-2">
              <span>➜</span>
              <span className="text-blue-400">~</span>
              <input 
                id="term-input"
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-slate-200"
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};