import { useState, useRef, useCallback } from 'react';
import BlackHole from './BlackHole';
import { formatFileSize, getFileEmoji } from '../lib/fileUtils';

export default function DropZone({ onFileSelect, dragOver, sending, progress, completed, peerBwId }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  }, [onFileSelect]);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelect?.(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileSelect]);

  const active = isDragOver || dragOver;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={selectedFile && !sending ? undefined : handleClick}
      className="relative flex flex-col items-center justify-center py-8 px-4 rounded-2xl transition-all duration-500 cursor-pointer group"
      style={{
        border: `2px dashed ${active ? '#7C3AED' : completed ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
        background: active
          ? 'rgba(124,58,237,0.05)'
          : completed
            ? 'rgba(16,185,129,0.04)'
            : 'rgba(255,255,255,0.01)',
        boxShadow: active
          ? '0 0 50px rgba(124,58,237,0.12), inset 0 0 50px rgba(124,58,237,0.03)'
          : 'none',
      }}
    >
      {/* Animated ring when dragging */}
      {active && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              border: '1px solid transparent',
              borderImage: 'linear-gradient(135deg, #7C3AED, #06B6D4, #A78BFA, #7C3AED) 1',
              animation: 'ringSpin 2s linear infinite',
            }}
          />
        </div>
      )}

      <BlackHole
        size={280}
        dragOver={active}
        sending={sending}
        progress={progress}
        completed={completed}
      />

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Selected file info */}
      {selectedFile && !sending && !completed && (
        <div className="flex items-center gap-3 mt-5 px-4 py-2.5 rounded-button bg-bw-surface/80 border border-bw-border/50 animate-scaleIn">
          <span className="text-2xl">{getFileEmoji(selectedFile.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-bw-white font-inter text-sm truncate">{selectedFile.name}</p>
            <p className="text-bw-muted text-xs font-jetbrains-mono">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            onClick={handleRemove}
            className="text-bw-muted hover:text-bw-red transition-colors text-lg hover:scale-110 active:scale-90"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hint text */}
      {!selectedFile && !sending && !completed && (
        <p className={`mt-5 font-inter text-sm text-center px-4 transition-all duration-300 ${
          active ? 'text-bw-purple-lt' : 'text-bw-muted'
        }`}>
          {active
            ? 'Release to drop into the black hole'
            : 'Drop a file here, or click to select'}
        </p>
      )}

      {/* Completion */}
      {completed && peerBwId && (
        <div className="text-center mt-5 animate-fadeUp">
          <p className="text-bw-green font-inter text-sm font-medium">
            ✓ Delivered to <span className="font-jetbrains-mono">{peerBwId}</span>
          </p>
          <p className="text-bw-muted text-xs mt-1">File auto-saved on their device</p>
        </div>
      )}

      {/* Sending status */}
      {sending && (
        <p className="text-bw-cyan font-inter text-sm mt-3 animate-breathe">
          {Math.round(progress)}% · Pulling into the void
        </p>
      )}
    </div>
  );
}
