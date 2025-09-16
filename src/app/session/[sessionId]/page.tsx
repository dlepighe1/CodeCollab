'use client';

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { User, Code, Users, PenTool, Zap, Plus, X, Columns, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserDropdown from '@/components/editor/user-dropdown';
import { LANGUAGES, DEFAULT_CODE } from "@/components/lib/constants";
import FileManager from "@/components/editor/file-manager";
import ParticipantList from "@/components/editor/participantList";
import CodeEditor from '@/components/editor/code-editor';
import Output from '@/components/editor/console-output';

// --- Interface Definitions ---
interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string; // display name, e.g. "JavaScript"
}

interface Panel {
  id: string; // Unique ID for the panel itself
  fileId: string; // ID of the file it's displaying
}

type LangKey = keyof typeof LANGUAGES;

// --- Main Session Component ---
const SessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sp = useSearchParams();
  const userName = sp.get('name') ?? 'Guest';
  const initialLangKey = (sp.get('lang') as LangKey) ?? 'javascript';
  const router = useRouter();

  const initialLang = LANGUAGES[initialLangKey];
  const initialCode = DEFAULT_CODE[initialLangKey] || `// Welcome ${userName}!\n// Right-click my name above to split the view!`;

  const monacoLang = useMemo<string>(
    () => (initialLangKey === 'txt' ? 'plaintext' : initialLangKey),
    [initialLangKey]
  );

  const [files, setFiles] = useState<FileItem[]>([
    {
      id: Date.now().toString(),
      name: `main.${initialLang.extension}`,
      content: initialCode,
      language: initialLang.name,
    }
  ]);

  const [panels, setPanels] = useState<Panel[]>([{ id: `panel-${Date.now()}`, fileId: files[0].id }]);
  const [focusedPanelId, setFocusedPanelId] = useState<string | null>(panels[0].id);
  const [panelWidths, setPanelWidths] = useState<number[]>([]);
  const [userAvatar, setUserAvatar] = useState<string>("https://via.placeholder.com/50");
  const [participants, setParticipants] = useState([userName]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [newlyCreatedFileId, setNewlyCreatedFileId] = useState<string | null>(null);
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number; panelId: string } | null>(null);
  const [users, setUsers] = useState([
    { id: '1', nickname: userName, color: '#3b82f6', cursor: null },
    { id: '2', nickname: 'Alex', color: '#ef4444', cursor: { line: 2, column: 5 } },
    { id: '3', nickname: 'Sam', color: '#10b981', cursor: { line: 1, column: 12 } },
    { id: '4', nickname: 'Roy', color: '#ef4444', cursor: { line: 2, column: 5 } },
    { id: '5', nickname: 'Ed', color: '#10b981', cursor: { line: 1, column: 12 } }
  ]);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  const focusedPanel = panels.find(p => p.id === focusedPanelId);
  const focusedFile = files.find(f => f.id === focusedPanel?.fileId);

  useEffect(() => {
    const monaco = require('monaco-editor');
    if (monaco) {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        jsx: monaco.languages.typescript.JsxEmit.React,
        target: monaco.languages.typescript.ScriptTarget.ES2016,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        typeRoots: ["./node_modules/@types"]
      });
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    }
  }, []);

  useEffect(() => {
    if (panels.length === 2 && panelWidths.length === 0) {
      setPanelWidths([50, 50]);
    }
    const handleClick = () => setEditorContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [panels, panelWidths]);

  const handleFileSelect = (fileId: string) => {
    if (!focusedPanelId) return;
    setPanels(prevPanels =>
      prevPanels.map(p =>
        p.id === focusedPanelId ? { ...p, fileId } : p
      )
    );
    setFocusedPanelId(focusedPanelId);
  };

  const handleOpenToSide = (fileId: string) => {
    if (panels.length >= 2) return;
    const newPanelId = `panel-${Date.now()}`;
    setPanels(prev => [...prev, { id: newPanelId, fileId }]);
    setFocusedPanelId(newPanelId);
    setPanelWidths([50, 50]);
  };

  const handleClosePanel = (panelIdToClose: string) => {
    if (panels.length <= 1) return;
    const newPanels = panels.filter(p => p.id !== panelIdToClose);
    setPanels(newPanels);
    if (focusedPanelId === panelIdToClose) {
      setFocusedPanelId(newPanels[0]?.id || null);
    }
    if (newPanels.length === 1) {
      setPanelWidths([]);
    }
  };

  const handleFileDelete = (id: string) => {
    if (files.length <= 1) return;
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    const remainingPanels = panels.filter(p => p.fileId !== id);
    if (remainingPanels.length === panels.length) return;
    if (remainingPanels.length === 0) {
      const fallbackFileId = updatedFiles[0].id;
      const newPanelId = `panel-${Date.now()}`;
      setPanels([{ id: newPanelId, fileId: fallbackFileId }]);
      setFocusedPanelId(newPanelId);
    } else {
      setPanels(remainingPanels);
      if (!remainingPanels.find(p => p.id === focusedPanelId)) {
        setFocusedPanelId(remainingPanels[0].id);
      }
    }
  };

  const handleCreateFile = () => {
    const defaultName = `NewFile.${initialLang.extension}`;
    let name = defaultName;
    let counter = 1;
    while (files.some(f => f.name === name)) {
      name = `NewFile(${counter}).${initialLang.extension}`;
      counter++;
    }
    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      content: `// New ${userName}'s file\n`,
      language: initialLang.name,
    };
    const updatedFiles = [...files, newFile].sort((a, b) => a.name.localeCompare(b.name));
    setFiles(updatedFiles);
    handleFileSelect(newFile.id);
    setNewlyCreatedFileId(newFile.id);
  };

  const handleEndSession = () => router.push('/');

  const handleEditorContextMenu = (e: React.MouseEvent, panelId: string) => {
    e.preventDefault();
    setEditorContextMenu({ x: e.clientX, y: e.clientY, panelId });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const container = document.querySelector('.split-view-container') as HTMLElement | null;
    if (!container) return;
    const totalWidth = container.clientWidth;
    const newLeftWidth = ((e.clientX - container.getBoundingClientRect().left) / totalWidth) * 100;
    if (newLeftWidth > 10 && newLeftWidth < 90) {
      setPanelWidths([newLeftWidth, 100 - newLeftWidth]);
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleAddUser = () => {};
  const handleRemoveUser = () => {};
  const handleKickUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const handleRunCode = async () => {
    if (isExecuting || !focusedFile) return;
    setIsExecuting(true);
    const startTime = performance.now();
  
    setConsoleOutput(`[Running] ${focusedFile.name}\n\n`);
  
    try {
      const languageInfo = LANGUAGES[initialLangKey];
  
      const payload = {
        language: initialLangKey,
        version: languageInfo.version,
        files: [{ content: focusedFile.content }],
      };
  
      const response = await fetch('/api/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json();
  
      let newOutput = '';
      let exitCode = 0;
  
      if (response.ok) {
        if (result.run.stderr) {
          newOutput = result.run.stderr;
          exitCode = 1;
        } else {
          newOutput = result.run.stdout;
        }
      } else {
        newOutput = `Error: ${result.error || 'Failed to execute code.'}`;
        exitCode = 1;
      }
  
      const endTime = performance.now();
      const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);
  
      setConsoleOutput(
        (prev) => `${prev}${newOutput}\n[Done] Exited with code=${exitCode} in ${timeElapsed} seconds`
      );
  
    } catch (error) {
      const endTime = performance.now();
      const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);
      
      setConsoleOutput(
        (prev) => `${prev}Failed to connect to execution server. Error: ${error instanceof Error ? error.message : String(error)}\n\n[Done] Exited with code=1 in ${timeElapsed} seconds`
      );
    } finally {
      setIsExecuting(false);
    }
  };
  

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* --- Top Bar --- */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-semibold text-white">CodeCollab</span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-400 text-sm font-medium">{focusedFile?.language}</span>
          </div>
        </div>

        <ParticipantList
          users={users}
          currentUserId="1"
          onInviteClick={() => setShowInviteLinkModal(true)}
          sessionId={sessionId as string}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
          onKick={handleKickUser}
        />

        <UserDropdown
          nickname={userName}
          onSettingsClick={() => setShowSettingsModal(true)}
          onEndSession={handleEndSession}
        />
      </div>

      {/* --- Main Content Area (Sidebar + Editors) --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* --- File Manager Sidebar --- */}
        <div className="w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-xl">
          <FileManager
            files={files}
            focusedFileId={focusedFile?.id || null}
            onFileSelect={handleFileSelect}
            onFilesChange={setFiles}
            onFileDelete={handleFileDelete}
            onCreateFile={handleCreateFile}
            newlyCreatedFileId={newlyCreatedFileId}
            setNewlyCreatedFileId={setNewlyCreatedFileId}
            onOpenFileToSide={handleOpenToSide}
            isSplitView={panels.length >= 2}
          />
        </div>

        {/* --- Editor Panels & Console --- */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-row overflow-hidden split-view-container">
            {panels.length === 2 ? (
              <>
                <div
                  key={panels[0].id}
                  className={`flex flex-col h-full transition-all duration-200 overflow-hidden ${
                    focusedPanelId === panels[0].id
                      ? 'ring-2 ring-blue-500 z-10 brightness-100'
                      : 'ring-1 ring-slate-800/50 brightness-75'
                  }`}
                  style={{ width: `${panelWidths[0]}%` }}
                  onClick={() => setFocusedPanelId(panels[0].id)}
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2 p-2">
                      <div className="bg-slate-800/60 rounded-md px-3 py-1">
                        <h4 className="text-sm text-slate-400 cursor-context-menu">
                          {files.find(f => f.id === panels[0].fileId)?.name}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleRunCode}
                          className="h-6 px-2 text-slate-400 hover:text-white"
                          variant="ghost"
                          disabled={isExecuting}
                        >
                          <Play size={16} /><span className="ml-1">Run</span>
                        </Button>
                        <button
                          onClick={() => handleClosePanel(panels[0].id)}
                          className="text-slate-500 p-1 rounded-sm hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <CodeEditor
                      value={files.find(f => f.id === panels[0].fileId)?.content || ''}
                      language={monacoLang}
                      onChange={(value) => {
                        const updatedFiles = files.map(f =>
                          f.id === panels[0].fileId ? { ...f, content: value || '' } : f
                        );
                        setFiles(updatedFiles);
                      }}
                    />
                  </div>
                </div>

                <div
                  className="w-1 bg-slate-700 cursor-ew-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={handleMouseDown}
                />

                <div
                  key={panels[1].id}
                  className={`flex flex-col h-full transition-all duration-200 overflow-hidden ${
                    focusedPanelId === panels[1].id
                      ? 'ring-2 ring-blue-500 z-10 brightness-100'
                      : 'ring-1 ring-slate-800/50 brightness-75'
                  }`}
                  style={{ width: `${panelWidths[1]}%` }}
                  onClick={() => setFocusedPanelId(panels[1].id)}
                >
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2 p-2">
                      <div className="bg-slate-800/60 rounded-md px-3 py-1">
                        <h4 className="text-sm text-slate-400 cursor-context-menu">
                          {files.find(f => f.id === panels[1].fileId)?.name}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleRunCode}
                          className="h-6 px-2 text-slate-400 hover:text-white"
                          variant="ghost"
                          disabled={isExecuting}
                        >
                          <Play size={16} /><span className="ml-1">Run</span>
                        </Button>
                        <button
                          onClick={() => handleClosePanel(panels[1].id)}
                          className="text-slate-500 p-1 rounded-sm hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <CodeEditor
                      value={files.find(f => f.id === panels[1].fileId)?.content || ''}
                      language={monacoLang}
                      onChange={(value) => {
                        const updatedFiles = files.map(f =>
                          f.id === panels[1].fileId ? { ...f, content: value || '' } : f
                        );
                        setFiles(updatedFiles);
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              panels.map((panel) => {
                const file = files.find(f => f.id === panel.fileId);
                if (!file) return null;
                const isFocused = focusedPanelId === panel.id;

                return (
                  <div
                    key={panel.id}
                    className={`flex-1 flex flex-col h-full transition-all duration-200 overflow-hidden ${isFocused ? 'ring-2 ring-blue-500 z-10 brightness-100' : 'ring-1 ring-slate-800/50 brightness-75'}`}
                    onClick={() => setFocusedPanelId(panel.id)}
                  >
                    <div className="flex-1 flex flex-col">
                      <div
                        className="flex items-center justify-between p-2"
                        onContextMenu={(e) => handleEditorContextMenu(e, panel.id)}
                      >
                        <div className="bg-slate-800/60 rounded-md px-3 py-1">
                          <h4 className="text-sm text-slate-400 cursor-context-menu">{file.name}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={handleRunCode}
                            className="h-6 px-2 text-slate-400 hover:text-white"
                            variant="ghost"
                            disabled={isExecuting}
                          >
                            <Play size={16} /><span className="ml-1">Run</span>
                          </Button>
                          {panels.length > 1 && (
                            <button
                              onClick={() => handleClosePanel(panel.id)}
                              className="text-slate-500 p-1 rounded-sm hover:text-white hover:bg-slate-700 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <CodeEditor
                        value={file.content}
                        language={monacoLang}
                        onChange={(value) => {
                          const updatedFiles = files.map(f =>
                            f.id === file.id ? { ...f, content: value || '' } : f
                          );
                          setFiles(updatedFiles);
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="h-64 border-t border-slate-800/50">
            <Output output={consoleOutput} />
          </div>
        </div>
      </div>

      {editorContextMenu && createPortal(
        <div
          className="absolute w-40 bg-slate-800 rounded shadow-lg z-50 text-slate-200 text-sm"
          style={{ top: editorContextMenu.y, left: editorContextMenu.x }}
        >
          <button
            className="w-full text-left px-3 py-2 hover:bg-slate-700 flex items-center space-x-2 disabled:opacity-50 disabled:hover:bg-slate-800"
            disabled={panels.length >= 2}
            onClick={() => {
              const panelToSplit = panels.find(p => p.id === editorContextMenu.panelId);
              if (panelToSplit) handleOpenToSide(panelToSplit.fileId);
              setEditorContextMenu(null);
            }}
          >
            <Columns size={14} />
            <span>Split Right</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SessionPage;