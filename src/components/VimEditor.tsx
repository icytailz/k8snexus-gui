import React, { useState, useEffect, useRef } from 'react';

/* ==================================================================================================================
   MODULE: VIM EDITOR
   Description: An authentic Vim-like editor component.
   ================================================================================================================== */

export const VimEditor = ({ 
  initialContent, 
  filename, 
  onSave, 
  onExit 
}: { 
  initialContent: string, 
  filename: string, 
  onSave: (content: string) => void, 
  onExit: () => void 
}) => { 
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'NORMAL' | 'INSERT' | 'COMMAND'>('NORMAL');
  const [commandBuffer, setCommandBuffer] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'INSERT' && textAreaRef.current) textAreaRef.current.focus();
  }, [mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'NORMAL') {
      if (e.key === 'i') { e.preventDefault(); setMode('INSERT'); } 
      else if (e.key === ':') { e.preventDefault(); setMode('COMMAND'); setCommandBuffer(':'); }
    } else if (mode === 'INSERT') {
      if (e.key === 'Escape') { e.preventDefault(); setMode('NORMAL'); }
    } else if (mode === 'COMMAND') {
      if (e.key === 'Enter') { e.preventDefault(); executeCommand(); } 
      else if (e.key === 'Escape') { e.preventDefault(); setMode('NORMAL'); setCommandBuffer(''); setStatusMessage(''); } 
      else if (e.key === 'Backspace') { 
        if (commandBuffer.length <= 1) { setMode('NORMAL'); setCommandBuffer(''); } 
        else { setCommandBuffer(prev => prev.slice(0, -1)); }
      } else if (e.key.length === 1) { setCommandBuffer(prev => prev + e.key); }
    }
  };

  const executeCommand = () => {
    const cmd = commandBuffer.slice(1).trim();
    if (cmd === 'wq' || cmd === 'x') { onSave(content); onExit(); } 
    else if (cmd === 'q!') { onExit(); } 
    else if (cmd === 'q') {
      if (content !== initialContent) { setStatusMessage("E37: No write since last change (add ! to override)"); setMode('NORMAL'); } 
      else { onExit(); }
    } else if (cmd === 'w') { onSave(content); setStatusMessage(`"${filename}" written`); setMode('NORMAL'); } 
    else { setStatusMessage(`E492: Not an editor command: ${cmd}`); setMode('NORMAL'); }
    setCommandBuffer('');
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] font-mono text-sm" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="flex-1 relative">
        <textarea
          ref={textAreaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={mode !== 'INSERT'}
          className={`w-full h-full bg-transparent resize-none outline-none p-4 leading-relaxed ${mode === 'NORMAL' ? 'text-gray-300 cursor-default' : 'text-white'}`}
          spellCheck={false}
        />
        <div className="absolute top-4 left-0 w-8 text-right text-gray-600 select-none pointer-events-none">
          {content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
      </div>
      <div className="bg-[#2d2d2d] text-gray-300 px-2 py-1 flex justify-between items-center text-xs border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span className="font-bold uppercase text-black bg-gray-400 px-1">{mode}</span>
          <span>{filename}</span>
          {statusMessage && <span className="text-red-400">{statusMessage}</span>}
        </div>
        <div className="flex gap-4"><span>utf-8</span><span>100%</span><span>1:1</span></div>
      </div>
      {(mode === 'COMMAND' || mode === 'NORMAL') && (
        <div className="bg-[#1e1e1e] text-white px-2 py-1 h-6 border-t border-gray-800">{mode === 'COMMAND' ? commandBuffer : ''}</div>
      )}
    </div>
  );
};
