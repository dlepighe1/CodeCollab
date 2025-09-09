'use client';

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { User, Code, Users, PenTool, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserDropdown from '@/components/editor/user-dropdown';
import { LANGUAGES } from "@/components/lib/constants";
import FileManager from "@/components/editor/file-manager";
import ParticipantList from "@/components/editor/participantList";

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
  const initialLang = (sp.get('lang') as 'python' | 'java' | 'cpp') ?? 'javascript';

  const router = useRouter();

  const [files, setFiles] = useState<FileItem[]>([
    {
      id: Date.now().toString(),
      name: `main.${LANGUAGES[initialLang].extension}`,
      content: `// Welcome ${userName}!\n`,
      language: LANGUAGES[initialLang].name,
    }
  ]);

  const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
  const [userAvatar, setUserAvatar] = useState<string>("https://via.placeholder.com/50");
  const [participants, setParticipants] = useState([userName]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);
  
  // New state to manage immediate renaming after creation
  const [newlyCreatedFileId, setNewlyCreatedFileId] = useState<string | null>(null);

  const [users] = useState([
    { id: '1', nickname: userName, color: '#3b82f6', cursor: null },
    { id: '2', nickname: 'Alex', color: '#ef4444', cursor: { line: 2, column: 5 } },
    { id: '3', nickname: 'Sam', color: '#10b981', cursor: { line: 1, column: 12 } },
    { id: '4', nickname: 'Roy', color: '#ef4444', cursor: { line: 2, column: 5 } },
    { id: '5', nickname: 'Ed', color: '#10b981', cursor: { line: 1, column: 12 } }
  ]);

  const activeFile = files.find(f => f.id === activeFileId);

  const handleFileSelect = (id: string) => {
    setActiveFileId(id);
  };

  const handleLanguageChange = (lang: string) => {
    if (!activeFile) return;
    const updatedFiles = files.map(f =>
      f.id === activeFile.id ? { ...f, language: lang, name: `main.${lang}` } : f
    );
    setFiles(updatedFiles);
  };

  const handleFileDelete = (id: string) => {
    if (files.length === 1) return;
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);

    if (activeFileId === id && updatedFiles.length > 0) {
      setActiveFileId(updatedFiles[updatedFiles.length - 1].id);
    }
  };

  const handleCreateFile = () => {
    const defaultName = `NewFile.${LANGUAGES[initialLang].extension}`;
    let name = defaultName;
    let counter = 1;

    // Generate a unique name
    while (files.some(f => f.name === name)) {
      name = `NewFile(${counter}).${LANGUAGES[initialLang].extension}`;
      counter++;
    }

    const newFile: FileItem = {
      id: Date.now().toString(),
      name,
      content: `// New ${userName}'s file\n`,
      language: LANGUAGES[initialLang].name,
    };

    const updatedFiles = [...files, newFile].sort((a, b) => a.name.localeCompare(b.name));
    setFiles(updatedFiles);
    setActiveFileId(newFile.id);
    // Set the state for immediate renaming
    setNewlyCreatedFileId(newFile.id); 
  };

  const handleEndSession = () => {
    router.push('/');
  };

  const handleInviteParticipant = () => {
    const newParticipant = prompt("Enter participant's name");
    if (newParticipant && !participants.includes(newParticipant)) {
      setParticipants([...participants, newParticipant]);
    }
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-semibold text-white">CodeCollab</span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-400 text-sm font-medium">{activeFile?.language}</span>
          </div>
        </div>

        <ParticipantList
          users={users}
          currentUserId="1"
          onInviteClick={() => setShowInviteLinkModal(true)}
        />

        <UserDropdown
          nickname={userName}
          onSettingsClick={() => setShowSettingsModal(true)}
          onEndSession={handleEndSession}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-xl">
          <FileManager
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onFilesChange={setFiles}
            onLanguageChange={handleLanguageChange}
            onFileDelete={handleFileDelete}
            onCreateFile={handleCreateFile}
            // Pass the new state and setter to FileManager
            newlyCreatedFileId={newlyCreatedFileId}
            setNewlyCreatedFileId={setNewlyCreatedFileId}
          />
        </div>

        <div className="flex-1 flex flex-col">
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

          <div className="h-64 border-t border-slate-800/50 p-4 bg-slate-900 text-slate-400">
            <p>Console Placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionPage;