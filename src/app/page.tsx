// app/(your-route)/page.tsx
'use client';

import React, { FormEvent, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/components/lib/socketClient';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, PenTool, Users, Zap } from 'lucide-react';

type Language = 'javascript' | 'python' | 'java' | 'cpp';
type FormState = { nickname: string; sessionId: string; language: Language };

export default function LobbyPage() {
  const router = useRouter();

  const [sessionType, setSessionType] = useState<'join' | null>(null);
  const [form, setForm] = useState<FormState>({ nickname: '', sessionId: '', language: 'javascript' });
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [errors, setErrors] = useState<{ nickname?: string; sessionId?: string; global?: string }>({});

  const nicknameRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<HTMLInputElement>(null);

  // Ensure a clean socket lifecycle in the Lobby: connect on mount, disconnect on unmount
  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => {
      // Keep Lobby lean; Session page will reconnect with its own lifecycle.
      if (socket.connected) socket.disconnect();
    };
  }, []);

  const onNicknameChange = (v: string) => {
    setForm((p) => ({ ...p, nickname: v }));
    if (errors.nickname) setErrors((e) => ({ ...e, nickname: undefined }));
    if (errors.global) setErrors((e) => ({ ...e, global: undefined }));
  };
  const onSessionIdChange = (v: string) => {
    setForm((p) => ({ ...p, sessionId: v }));
    if (errors.sessionId) setErrors((e) => ({ ...e, sessionId: undefined }));
    if (errors.global) setErrors((e) => ({ ...e, global: undefined }));
  };

  const validateCreate = () => {
    if (!form.nickname.trim()) {
      setErrors({ nickname: 'Please enter a nickname to create a session.' });
      nicknameRef.current?.focus();
      return false;
    }
    setErrors({});
    return true;
  };

  const validateJoin = () => {
    const next: typeof errors = {};
    if (!form.nickname.trim()) next.nickname = 'Please enter a nickname to join.';
    if (!form.sessionId.trim()) next.sessionId = 'Please enter a valid session code.';
    if (next.nickname || next.sessionId) {
      setErrors(next);
      if (next.nickname) nicknameRef.current?.focus();
      else if (next.sessionId) sessionIdRef.current?.focus();
      return false;
    }
    setErrors({});
    return true;
  };

  // CREATE → navigate immediately with ?name & ?lang
  const handleCreate = async () => {
    if (!validateCreate()) return;

    try {
      setCreating(true);
      if (!socket.connected) socket.connect();

      socket.emit(
        'room:create',
        { nickname: form.nickname.trim(), language: form.language },
        (ack: { ok: boolean; roomId?: string; message?: string }) => {
          if (!ack?.ok || !ack.roomId) {
            setErrors({ global: ack?.message || 'Could not create session.' });
            setCreating(false);
            return;
          }

          const roomId = ack.roomId;
          setCreating(false);

          // Carry identity + language to the Session page
          router.push(
            `/session/${roomId}?name=${encodeURIComponent(form.nickname.trim())}&lang=${encodeURIComponent(
              form.language
            )}`
          );
        }
      );
    } catch {
      setErrors({ global: 'Something went wrong while creating a session.' });
      setCreating(false);
    }
  };

  // JOIN → navigate immediately with ?name & ?lang
  const handleJoin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateJoin()) return;

    try {
      setJoining(true);
      if (!socket.connected) socket.connect();

      const nickname = form.nickname.trim();
      const roomId = form.sessionId.trim().toUpperCase();

      socket.emit(
        'room:join',
        { nickname, roomId },
        (ack: { ok: boolean; roomId?: string; message?: string }) => {
          if (!ack?.ok) {
            setErrors({ global: ack?.message || 'Could not join session.' });
            setJoining(false);
            return;
          }

          setJoining(false);
          router.push(
            `/session/${roomId}?name=${encodeURIComponent(nickname)}&lang=${encodeURIComponent(form.language)}`
          );
        }
      );
    } catch {
      setErrors({ global: 'Could not join session. Check the code and try again.' });
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-blue-500/30 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/5 to-transparent pointer-events-none" />

        <CardHeader className="text-center pb-2 relative z-10">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 backdrop-blur-sm">
            <Code className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            CodeCollab
          </CardTitle>
          <CardDescription className="text-slate-300">Join the collaborative programming experience</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:scale-105 transition-transform duration-300">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-blue-300">Collaborate</p>
              <p className="text-xs text-blue-400/70">Up to 6 users</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/20 backdrop-blur-sm border border-green-500/30 shadow-lg shadow-green-500/10 hover:scale-105 transition-transform duration-300">
              <Zap className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-green-300">Live Coding</p>
              <p className="text-xs text-green-400/70">Real-time sync</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 shadow-lg shadow-purple-500/10 hover:scale-105 transition-transform duration-300">
              <PenTool className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-purple-300">Whiteboard</p>
              <p className="text-xs text-purple-400/70">Draw together</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleJoin} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="nickname" className="text-sm font-medium text-slate-200">Nickname</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Your coding alias"
                ref={nicknameRef}
                value={form.nickname}
                onChange={(e) => onNicknameChange(e.target.value)}
                aria-invalid={!!errors.nickname}
                aria-describedby={errors.nickname ? 'nickname-error' : undefined}
                className={`bg-slate-800/60 backdrop-blur-sm border text-white placeholder-slate-400 focus:ring-blue-400/50 shadow-lg ${
                  errors.nickname ? 'border-red-500 focus:border-red-500' : 'border-blue-500/40 focus:border-blue-400'
                }`}
              />
              {errors.nickname && <p id="nickname-error" className="text-xs text-red-400">{errors.nickname}</p>}
            </div>

            {sessionType !== 'join' && (
              <div className="space-y-1.5">
                <Label htmlFor="language" className="text-sm font-medium text-slate-200">Preferred Programming Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm((p) => ({ ...p, language: v as Language }))}
                >
                  <SelectTrigger className="w-full bg-slate-800/60 backdrop-blur-sm border border-purple-500/40 text-white focus:border-purple-400 focus:ring-purple-400/50 shadow-lg shadow-purple-500/10 rounded-md px-3 py-2 text-sm">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-slate-200 border border-slate-700">
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {!sessionType && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-200">Choose an option</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreate}
                    disabled={creating}
                    aria-busy={creating}
                    className="bg-slate-800/60 backdrop-blur-sm border border-blue-500/40 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 hover:border-blue-400 transition-transform duration-300 active:scale-[0.98]"
                  >
                    {creating ? 'Creating…' : 'Create Session'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSessionType('join');
                      setErrors((e) => ({ ...e, sessionId: undefined, global: undefined }));
                    }}
                    aria-expanded={sessionType === 'join'}
                    className="bg-slate-800/60 backdrop-blur-sm border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-400 transition-transform duration-300 active:scale-[0.98]"
                  >
                    Join Session
                  </Button>
                </div>
              </div>
            )}

            {sessionType === 'join' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sessionId" className="text-sm font-medium text-slate-200">Session Code</Label>
                  <Input
                    id="sessionId"
                    type="text"
                    placeholder="Paste invite code"
                    ref={sessionIdRef}
                    value={form.sessionId}
                    onChange={(e) => onSessionIdChange(e.target.value)}
                    aria-invalid={!!errors.sessionId}
                    aria-describedby={errors.sessionId ? 'sessionId-error' : undefined}
                    className={`bg-slate-800/60 backdrop-blur-sm border text-white placeholder-slate-400 focus:ring-cyan-400/50 shadow-lg ${
                      errors.sessionId ? 'border-red-500 focus:border-red-500' : 'border-cyan-500/40 focus:border-cyan-400'
                    }`}
                  />
                  {errors.sessionId && <p id="sessionId-error" className="text-xs text-red-400">{errors.sessionId}</p>}
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={joining}
                    aria-busy={joining}
                    className="w-full backdrop-blur-sm text-white font-medium py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg border bg-gradient-to-r from-cyan-600/80 to-cyan-500/80 hover:from-cyan-700/90 hover:to-cyan-600/90 shadow-cyan-500/30 border-cyan-400/30"
                  >
                    {joining ? 'Checking…' : 'Join Session'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSessionType(null);
                      setForm((p) => ({ ...p, sessionId: '' }));
                      setErrors({});
                    }}
                    className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-800/40"
                  >
                    Back
                  </Button>
                </div>
              </>
            )}
          </form>

          {errors.global && <p className="flex justify-center text-sm text-red-400">{errors.global}</p>}

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">No data is stored permanently. Your session is temporary.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
