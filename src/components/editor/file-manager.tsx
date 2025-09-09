'use client';

import { useState } from "react";
import { createPortal } from "react-dom";

interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface FileManagerProps {
  files: FileItem[];
  activeFileId: string;
  onFileSelect: (id: string) => void;
  onFilesChange: (files: FileItem[]) => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onFilesChange,
}) => {
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [openDropdown, setOpenDropdown] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleCreateFile = () => {
    let counter = 1;
    let name = "NewFile.js";
    while (files.some(f => f.name === name)) {
      name = `NewFile(${counter}).js`;
      counter++;
    }

    const id = Date.now().toString();
    const newFile: FileItem = {
      id,
      name,
      content: '',
      language: 'javascript',
    };

    const updatedFiles = [...files, newFile].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    onFilesChange(updatedFiles);
    onFileSelect(id);

    setRenamingFileId(id);
    setTempName(name);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length === 1) return;
    const updatedFiles = files.filter(f => f.id !== id);
    onFilesChange(updatedFiles);
    if (activeFileId === id && updatedFiles.length > 0) {
      onFileSelect(updatedFiles[updatedFiles.length - 1].id); // Select the most recent file
    }
    setOpenDropdown(null);
  };

  const handleApplyRename = (id: string) => {
    const updatedFiles = files
      .map(f => (f.id === id ? { ...f, name: tempName } : f))
      .sort((a, b) => a.name.localeCompare(b.name));
    onFilesChange(updatedFiles);
    setRenamingFileId(null);
    setOpenDropdown(null);
  };

  const handleCancelRename = () => {
    if (renamingFileId && !files.some(f => f.id === renamingFileId && f.name !== tempName)) {
      const updatedFiles = files.filter(f => f.id !== renamingFileId);
      onFilesChange(updatedFiles);
      if (updatedFiles.length > 0) {
        onFileSelect(updatedFiles[updatedFiles.length - 1].id); // Select most recent file after cancel
      }
    }
    setRenamingFileId(null);
    setOpenDropdown(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-slate-800">
        <span className="text-slate-300 font-semibold text-sm">File Explorer</span>
        <button
          onClick={handleCreateFile}
          className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600 text-white"
        >
          +
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map(file => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-1 rounded cursor-pointer group ${
              file.id === activeFileId
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => {
              // Ensure the file is clickable if not renaming or dropdown not open
              if (!renamingFileId && openDropdown?.id !== file.id) {
                onFileSelect(file.id);
              }
            }}
          >
            {renamingFileId === file.id ? (
              <div className="flex items-center space-x-1 w-full">
                <input
                  className="flex-1 px-1 py-0.5 text-sm rounded bg-slate-700 text-white"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApplyRename(file.id);
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                />
                <button
                  className="text-green-500 font-bold px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyRename(file.id);
                  }}
                >
                  ✓
                </button>
                <button
                  className="text-red-500 font-bold px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelRename();
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{file.name}</span>

                {/* 3-dot button */}
                <button
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 px-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLButtonElement).getBoundingClientRect();
                    setOpenDropdown(
                      openDropdown?.id === file.id
                        ? null
                        : { id: file.id, x: rect.right + 4, y: rect.top }
                    );
                  }}
                >
                  ⋮
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dropdown Portal */}
      {openDropdown &&
        createPortal(
          <div
            className="absolute w-28 bg-slate-800 rounded shadow-lg z-50"
            style={{ top: openDropdown.y + window.scrollY, left: openDropdown.x + window.scrollX }}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <button
              className="w-full text-left px-2 py-1 text-sm hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                setRenamingFileId(openDropdown.id);
                setTempName(files.find(f => f.id === openDropdown.id)?.name || '');
                setOpenDropdown(null);
              }}
            >
              Rename
            </button>
            <button
              className="w-full text-left px-2 py-1 text-sm text-red-500 hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(openDropdown.id);
              }}
            >
              Delete
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FileManager;
