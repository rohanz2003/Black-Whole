import { useState, useRef, useCallback } from 'react';
import BlackHole from './BlackHole';

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
  const borderColor = active ? '#7C3AED' : completed ? '#10B981' : 'rgba(255,255,255,0.08)';
  const bgColor = active ? 'rgba(124,58,237,0.06)' : completed ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={selectedFile ? undefined : handleClick}
      style={{
        border: `2px dashed ${borderColor}`,
        borderRadius: 20,
        background: bgColor,
        cursor: selectedFile ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: active ? '0 0 40px rgba(124,58,237,0.15)' : 'none',
      }}
      className="flex flex-col items-center justify-center py-8 px-4"
    >
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

      {selectedFile && !sending && !completed && (
        <div className="flex items-center gap-3 mt-4 px-4 py-2 rounded-button bg-bw-surface border border-bw-border">
          <span className="text-2xl">
            {selectedFile.type?.startsWith('video/') ? '🎬' :
             selectedFile.type?.startsWith('audio/') ? '🎵' :
             selectedFile.type?.startsWith('image/') ? '🖼️' : '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-bw-white font-inter text-sm truncate">{selectedFile.name}</p>
            <p className="text-bw-muted text-xs font-jetbrains-mono">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button onClick={handleRemove} className="text-bw-muted hover:text-bw-red transition-colors text-lg">✕</button>
        </div>
      )}

      {!selectedFile && !sending && !completed && (
        <p className="mt-4 text-bw-muted font-inter text-sm text-center px-4">
          {active ? 'Release to drop into the black hole' : 'Drop a file here, or click to select'}
        </p>
      )}

      {completed && peerBwId && (
        <div className="text-center mt-4">
          <p className="text-bw-green font-inter text-sm">✓ Received by {peerBwId}</p>
          <p className="text-bw-muted text-xs mt-1">File auto-saved on their device</p>
        </div>
      )}

      {sending && (
        <p className="text-bw-cyan font-inter text-sm mt-2">
          Sending... {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
