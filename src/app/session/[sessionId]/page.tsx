// app/session/[sessionId]/page.tsx  (or wherever your SessionPage lives)
'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Columns, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserDropdown from '@/components/editor/user-dropdown';
import { LANGUAGES, DEFAULT_CODE } from "@/components/libs/constants";
import FileManager from "@/components/editor/file-manager";
import ParticipantList from "@/components/editor/participantList";
import CodeEditor from '@/components/editor/code-editor';
import Output from '@/components/editor/console-output';
import { socket } from '@/components/lib/socketClient';

interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
}
interface Panel { id: string; fileId: string; }

type LangKey = keyof typeof LANGUAGES;
type PresenceUser = { id: string; nickname: string; color: string };

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 45%)`;
}

const SessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  // Identity & lang from URL
  const userName = (sp.get('name') || '').trim() || 'You';
  const initialLangKey = ((sp.get('lang') as LangKey) || 'javascript');
  const initialLang = LANGUAGES[initialLangKey];
  const initialCode = DEFAULT_CODE[initialLangKey] || `// Welcome ${userName}!\n// Right-click filename to split the view!`;
  const monacoLang = useMemo<string>(() => (initialLangKey === 'txt' ? 'plaintext' : initialLangKey), [initialLangKey]);

  // ===== Document & Panels =====
  const [files, setFiles] = useState<FileItem[]>([
    { id: 'main', name: `main.${initialLang.extension}`, content: initialCode, language: initialLang.name }
  ]);
  const [panels, setPanels] = useState<Panel[]>([{ id: `panel-${Date.now()}`, fileId: 'main' }]);
  const [focusedPanelId, setFocusedPanelId] = useState<string | null>(panels[0].id);
  const [panelWidths, setPanelWidths] = useState<number[]>([]);

  // ===== Presence & UI =====
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [adminNickname, setAdminNickname] = useState<string>('');
  const [roomLanguage, setRoomLanguage] = useState<string>(initialLang.name);
  const [roomId, setRoomId] = useState<string>((sessionId as string)?.toUpperCase());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  const [newlyCreatedFileId, setNewlyCreatedFileId] = useState<string | null>(null);
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number; panelId: string } | null>(null);

  // ===== Console run =====
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // ===== Refs for collaboration =====
  const selfIdRef = useRef<string>('');
  const curVersionRef = useRef<number>(1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentContentRef = useRef<string>(files[0].content);

  // Monaco defaults (optional)
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

  // Split view init & context-menu cleanup
  useEffect(() => {
    if (panels.length === 2 && panelWidths.length === 0) setPanelWidths([50, 50]);
    const handleClick = () => setEditorContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [panels, panelWidths]);

  // ===== Socket lifecycle =====
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      selfIdRef.current = socket.id;

      // Try join room; if not found, create using same roomId
      socket.emit('room:join', { roomId, nickname: userName }, (ack: any) => {
        if (ack?.ok) {
          // fetch initial state + doc
          socket.emit('room:state', roomId, (stateAck: any) => {
            if (stateAck?.ok) {
              setAdminNickname(stateAck.admin);
              setRoomLanguage(stateAck.language || initialLang.name);
              // Use server list + add self if missing
              const base = Array.from(new Set([...(stateAck.members as string[]), userName]));
              setUsers(base.map(n => ({
                id: n === userName ? selfIdRef.current : n,
                nickname: n,
                color: colorFor(n)
              })));
            }
          });
          socket.emit('doc:fetch', roomId, (docAck: any) => {
            if (docAck?.ok) {
              curVersionRef.current = docAck.version || 1;
              setFiles(prev => [{ ...prev[0], content: docAck.content }, ...prev.slice(1)]);
              lastSentContentRef.current = docAck.content;
            }
          });
        } else if (ack?.code === 'ROOM_NOT_FOUND') {
          // Create with fixed roomId so URL stays stable
          socket.emit('room:create', { roomId, nickname: userName, language: initialLangKey }, (createAck: any) => {
            if (createAck?.ok) {
              setRoomId(createAck.roomId);
              setAdminNickname(userName);
              setUsers([{ id: selfIdRef.current, nickname: userName, color: colorFor(userName) }]);

              socket.emit('room:state', createAck.roomId, (stateAck: any) => {
                if (stateAck?.ok) {
                  setAdminNickname(stateAck.admin);
                  setRoomLanguage(stateAck.language || initialLang.name);
                }
              });
              socket.emit('doc:fetch', createAck.roomId, (docAck: any) => {
                if (docAck?.ok) {
                  curVersionRef.current = docAck.version || 1;
                  setFiles(prev => [{ ...prev[0], content: docAck.content }, ...prev.slice(1)]);
                  lastSentContentRef.current = docAck.content;
                }
              });
            }
          });
        }
      });
    };

    // membership live updates
    const onMembers = (payload: { roomId: string; admin: string; language: string; members: string[] }) => {
      if (!payload || payload.roomId !== roomId) return;
      setAdminNickname(payload.admin);
      setRoomLanguage(payload.language || initialLang.name);

      const withSelf = Array.from(new Set([...(payload.members || []), userName]));
      setUsers(withSelf.map(n => ({
        id: n === userName ? selfIdRef.current : n,
        nickname: n,
        color: colorFor(n)
      })));
    };

    const onUserJoined = ({ id, nickname }: { id: string; nickname: string }) => {
      setUsers(prev => {
        if (prev.some(u => u.nickname === nickname)) return prev;
        return [...prev, { id: id || nickname, nickname, color: colorFor(nickname) }];
      });
    };

    const onUserLeft = ({ id, nickname }: { id: string; nickname: string }) => {
      setUsers(prev => prev.filter(u => u.nickname !== nickname && u.id !== id));
    };

    const onDocApply = ({ content, version, author }: { content: string; version: number; author?: string }) => {
      if (author === userName) return;
      if (version <= curVersionRef.current) return;
      curVersionRef.current = version;
      lastSentContentRef.current = content;
      setFiles(prev => [{ ...prev[0], content }, ...prev.slice(1)]);
    };

    socket.on('connect', onConnect);
    socket.on('room:members', onMembers);
    socket.on('room:user-joined', onUserJoined);
    socket.on('room:user-left', onUserLeft);
    socket.on('doc:apply', onDocApply);

    return () => {
      socket.off('connect', onConnect);
      socket.off('room:members', onMembers);
      socket.off('room:user-joined', onUserJoined);
      socket.off('room:user-left', onUserLeft);
      socket.off('doc:apply', onDocApply);
      // keep connection for navigation back? For cleanliness, disconnect:
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName, initialLangKey]);

  // ===== File/panel helpers =====
  const focusedPanel = panels.find(p => p.id === focusedPanelId);
  const focusedFile = files.find(f => f.id === focusedPanel?.fileId);

  const handleFileSelect = (fileId: string) => {
    if (!focusedPanelId) return;
    setPanels(prevPanels => prevPanels.map(p => (p.id === focusedPanelId ? { ...p, fileId } : p)));
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
    if (focusedPanelId === panelIdToClose) setFocusedPanelId(newPanels[0]?.id || null);
    if (newPanels.length === 1) setPanelWidths([]);
  };

  const handleFileDelete = (id: string) => {
    if (files.length <= 1) return;
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    const remainingPanels = panels.filter(p => p.fileId !== id);
    if (remainingPanels.length === 0) {
      const fallbackFileId = updatedFiles[0].id;
      const newPanelId = `panel-${Date.now()}`;
      setPanels([{ id: newPanelId, fileId: fallbackFileId }]);
      setFocusedPanelId(newPanelId);
    } else {
      setPanels(remainingPanels);
      if (!remainingPanels.find(p => p.id === focusedPanelId)) setFocusedPanelId(remainingPanels[0].id);
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
    setPanels([{ id: `panel-${Date.now()}`, fileId: newFile.id }]);
    setFocusedPanelId(panels[0]?.id || null);
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
    if (newLeftWidth > 10 && newLeftWidth < 90) setPanelWidths([newLeftWidth, 100 - newLeftWidth]);
  };
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // ===== Realtime doc: debounce emits & reconcile =====
  const emitDocUpdate = (nextContent: string) => {
    if (!roomId) return;
    if (nextContent === lastSentContentRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      socket.emit('doc:update', { roomId, content: nextContent, author: userName }, (ack: any) => {
        if (ack?.ok) {
          curVersionRef.current = ack.version;
          lastSentContentRef.current = nextContent;
        }
      });
    }, 200);
  };

  // ===== Run code =====
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
        if (result.run.stderr) { newOutput = result.run.stderr; exitCode = 1; }
        else { newOutput = result.run.stdout; }
      } else {
        newOutput = `Error: ${result.error || 'Failed to execute code.'}`;
        exitCode = 1;
      }
      const endTime = performance.now();
      const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);
      setConsoleOutput(prev => `${prev}${newOutput}\n[Done] Exited with code=${exitCode} in ${timeElapsed} seconds`);
    } catch (error) {
      const endTime = performance.now();
      const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);
      setConsoleOutput(prev => `${prev}Failed to connect to execution server. Error: ${error instanceof Error ? error.message : String(error)}\n\n[Done] Exited with code=1 in ${timeElapsed} seconds`);
    } finally {
      setIsExecuting(false);
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
            <span className="text-blue-400 text-sm font-medium">{roomLanguage}</span>
          </div>
        </div>

        <ParticipantList
          users={users}
          currentUserId={selfIdRef.current}
          adminNickname={adminNickname}
          onInviteClick={() => setShowInviteLinkModal(true)}
          sessionId={roomId}
          onAddUser={() => {}}
          onRemoveUser={() => {}}
          onKick={(userId) => setUsers(prev => prev.filter(u => u.id !== userId))}
        />

        <UserDropdown
          nickname={userName}
          onSettingsClick={() => setShowSettingsModal(true)}
          onEndSession={() => router.push('/')}
        />
      </div>

      {/* Sidebar + Editors */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-xl">
          <FileManager
            files={files}
            focusedFileId={files.find(f => f.id === focusedPanel?.fileId)?.id || null}
            onFileSelect={handleFileSelect}
            onFilesChange={setFiles}
            onFileDelete={handleFileDelete}
            onCreateFile={() => {
              const defaultName = `NewFile.${initialLang.extension}`;
              let name = defaultName;
              let counter = 1;
              while (files.some(f => f.name === name)) { name = `NewFile(${counter}).${initialLang.extension}`; counter++; }
              const newFile: FileItem = { id: Date.now().toString(), name, content: `// New ${userName}'s file\n`, language: initialLang.name };
              const updatedFiles = [...files, newFile].sort((a, b) => a.name.localeCompare(b.name));
              setFiles(updatedFiles);
              setPanels([{ id: `panel-${Date.now()}`, fileId: newFile.id }]);
              setFocusedPanelId(panels[0]?.id || null);
              setNewlyCreatedFileId(newFile.id);
            }}
            newlyCreatedFileId={newlyCreatedFileId}
            setNewlyCreatedFileId={setNewlyCreatedFileId}
            onOpenFileToSide={handleOpenToSide}
            isSplitView={panels.length >= 2}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-row overflow-hidden split-view-container">
            {panels.length === 2 ? (
              <>
                <div
                  key={panels[0].id}
                  className={`flex flex-col h-full transition-all duration-200 overflow-hidden ${
                    focusedPanelId === panels[0].id ? 'ring-2 ring-blue-500 z-10 brightness-100' : 'ring-1 ring-slate-800/50 brightness-75'
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
                        <Button onClick={handleRunCode} className="h-6 px-2 text-slate-400 hover:text-white" variant="ghost" disabled={isExecuting}>
                          <Play size={16} /><span className="ml-1">Run</span>
                        </Button>
                        <button onClick={() => {
                          if (panels.length > 1) {
                            setPanels(panels.filter(p => p.id !== panels[0].id));
                            setPanelWidths([]);
                          }
                        }} className="text-slate-500 p-1 rounded-sm hover:text-white hover:bg-slate-700">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <CodeEditor
                      value={files.find(f => f.id === panels[0].fileId)?.content || ''}
                      language={monacoLang}
                      onChange={(value) => {
                        const content = value || '';
                        setFiles(files.map(f => f.id === panels[0].fileId ? { ...f, content } : f));
                        emitDocUpdate(content);
                      }}
                    />
                  </div>
                </div>

                <div className="w-1 bg-slate-700 cursor-ew-resize hover:bg-blue-500 transition-colors" onMouseDown={handleMouseDown} />

                <div
                  key={panels[1].id}
                  className={`flex flex-col h-full transition-all duration-200 overflow-hidden ${
                    focusedPanelId === panels[1].id ? 'ring-2 ring-blue-500 z-10 brightness-100' : 'ring-1 ring-slate-800/50 brightness-75'
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
                        <Button onClick={handleRunCode} className="h-6 px-2 text-slate-400 hover:text-white" variant="ghost" disabled={isExecuting}>
                          <Play size={16} /><span className="ml-1">Run</span>
                        </Button>
                        <button onClick={() => {
                          if (panels.length > 1) {
                            setPanels(panels.filter(p => p.id !== panels[1].id));
                            setPanelWidths([]);
                          }
                        }} className="text-slate-500 p-1 rounded-sm hover:text-white hover:bg-slate-700">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <CodeEditor
                      value={files.find(f => f.id === panels[1].fileId)?.content || ''}
                      language={monacoLang}
                      onChange={(value) => {
                        const content = value || '';
                        setFiles(files.map(f => f.id === panels[1].fileId ? { ...f, content } : f));
                        emitDocUpdate(content);
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
                  <div key={panel.id} className={`flex-1 flex flex-col h-full transition-all duration-200 overflow-hidden ${isFocused ? 'ring-2 ring-blue-500 z-10 brightness-100' : 'ring-1 ring-slate-800/50 brightness-75'}`} onClick={() => setFocusedPanelId(panel.id)}>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between p-2" onContextMenu={(e) => setEditorContextMenu({ x: e.clientX, y: e.clientY, panelId: panel.id })}>
                        <div className="bg-slate-800/60 rounded-md px-3 py-1">
                          <h4 className="text-sm text-slate-400 cursor-context-menu">{file.name}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button onClick={handleRunCode} className="h-6 px-2 text-slate-400 hover:text-white" variant="ghost" disabled={isExecuting}>
                            <Play size={16} /><span className="ml-1">Run</span>
                          </Button>
                        </div>
                      </div>
                      <CodeEditor
                        value={file.content}
                        language={monacoLang}
                        onChange={(value) => {
                          const content = value || '';
                          setFiles(files.map(f => f.id === file.id ? { ...f, content } : f));
                          emitDocUpdate(content);
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
        <div className="absolute w-40 bg-slate-800 rounded shadow-lg z-50 text-slate-200 text-sm" style={{ top: editorContextMenu.y, left: editorContextMenu.x }}>
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
