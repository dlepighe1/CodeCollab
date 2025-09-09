'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
// Removed individual icon imports
import { FaFile } from 'react-icons/fa';
import { LANGUAGES } from "@/components/lib/constants";

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
  onLanguageChange: (lang: string) => void;
  onFileDelete: (id: string) => void;
  onCreateFile: () => void;
  newlyCreatedFileId: string | null;
  setNewlyCreatedFileId: (id: string | null) => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onFilesChange,
  onFileDelete,
  onCreateFile,
  newlyCreatedFileId,
  setNewlyCreatedFileId
}) => {
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [openDropdown, setOpenDropdown] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (newlyCreatedFileId) {
      setRenamingFileId(newlyCreatedFileId);
      setTempName(files.find(f => f.id === newlyCreatedFileId)?.name || '');
      setNewlyCreatedFileId(null);
    }
  }, [newlyCreatedFileId, files, setNewlyCreatedFileId]);

  const handleCreateFile = () => {
    onCreateFile();
  };

  const handleDeleteFile = (id: string) => {
    onFileDelete(id);
  };

  const handleApplyRename = (id: string) => {
    const updatedFiles = files.map(f => (f.id === id ? { ...f, name: tempName } : f)).sort((a, b) => a.name.localeCompare(b.name));
    onFilesChange(updatedFiles);
    setRenamingFileId(null);
    setOpenDropdown(null);
  };

  const handleCancelRename = () => {
    setRenamingFileId(null);
    setOpenDropdown(null);
  };

  // Dynamically get the file icon from the LANGUAGES constant
  const getFileIcon = (name: string) => {
    const extension = name.split('.').pop()?.toLowerCase();
    const language = Object.values(LANGUAGES).find(lang => lang.extension === extension);
    const IconComponent = language ? language.icon : FaFile;
    const color = language ? (
        language.name === 'JavaScript' ? 'text-yellow-500' :
        language.name === 'Python' ? 'text-blue-500' :
        language.name === 'Java' ? 'text-red-500' :
        language.name === 'C++' ? 'text-blue-300' :
        'text-gray-500'
    ) : 'text-gray-500';

    return <IconComponent className={`w-4 h-4 ${color}`} />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-slate-800">
        <span className="text-slate-300 font-semibold text-sm">File Explorer</span>
        <button
          onClick={handleCreateFile}
          className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600 text-white"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map(file => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-1 rounded cursor-pointer group ${file.id === activeFileId ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            onClick={() => onFileSelect(file.id)}
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
                <div className="flex items-center space-x-2">
                  {getFileIcon(file.name)}
                  <span className="truncate">{file.name}</span>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 px-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLButtonElement).getBoundingClientRect();
                    setOpenDropdown(
                      openDropdown?.id === file.id ? null : { id: file.id, x: rect.right + 4, y: rect.top }
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