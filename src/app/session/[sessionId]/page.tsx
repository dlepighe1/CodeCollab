'use client';

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import FileManager from "@/components/editor/file-manager"; // adjust path as needed

interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
}

const SessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sp = useSearchParams();
  const userName = sp.get('name') ?? 'Guest';
  const initialLang = (sp.get('lang') as 'python' | 'javascript' | 'java' | 'cpp') ?? 'javascript';

  // State to manage files
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: Date.now().toString(),
      name: `main.${initialLang === 'javascript' ? 'js' : initialLang}`,
      content: `// Welcome ${userName}!\n`,
      language: initialLang
    }
  ]);

  // State to track active file
  const [activeFileId, setActiveFileId] = useState<string>(files[0].id);

  // Active file derived from state
  const activeFile = files.find(f => f.id === activeFileId);

  // When files or activeFileId change, make sure top pane language updates immediately
  useEffect(() => {
    if (!activeFile && files.length > 0) {
      setActiveFileId(files[0].id);
    }
  }, [files, activeFile]);

  // Handle file selection
  const handleFileSelect = (id: string) => {
    setActiveFileId(id);
  };

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    if (!activeFile) return;
    const updatedFiles = files.map(f =>
      f.id === activeFile.id ? { ...f, language: lang } : f
    );
    setFiles(updatedFiles);
  };

  // Handle deleting a file
  const handleFileDelete = (id: string) => {
    if (files.length === 1) return; // prevent deleting last file
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);

    // If the deleted file was active, select the first remaining file
    if (activeFileId === id && updatedFiles.length > 0) {
      setActiveFileId(updatedFiles[0].id);
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-semibold text-white">CodeCollab</span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-400 text-sm font-medium">
              {activeFile?.language}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / File Manager */}
        <div className="w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-xl">
          <FileManager
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onFilesChange={setFiles}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        {/* Editor and Console */}
        <div className="flex-1 flex flex-col">
          {/* Editor */}
          <div className="flex-1 p-4 bg-slate-900 text-white">
            <h4 className="text-sm text-slate-400 mb-2">Editor - {activeFile?.name}</h4>
            <textarea
              className="w-full h-full bg-slate-800 p-2 rounded resize-none text-sm font-mono"
              value={activeFile?.content}
              onChange={(e) => {
                if (!activeFile) return;
                const updatedFiles = files.map(f =>
                  f.id === activeFile.id ? { ...f, content: e.target.value } : f
                );
                setFiles(updatedFiles);
              }}
            />
          </div>

          {/* Console */}
          <div className="h-64 border-t border-slate-800/50 p-4 bg-slate-900 text-slate-400">
            <p>Console Placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionPage;
