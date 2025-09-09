'use client';

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
  FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, Users, PenTool, Zap } from 'lucide-react';

type SessionType = 'join' | null; // one-flow: only track 'join'

// --- helpers ---
function extractRoomId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'room');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch { /* not a URL; fall through */ }
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
}

async function createRoomOnServer(): Promise<string | null> {
  try {
    const r = await fetch('/api/rooms/create', { method: 'POST' });
    if (!r.ok) return null;
    const { id } = await r.json();
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

async function roomExists(roomId: string, timeoutMs = 5000): Promise<boolean> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`/api/rooms/exists?roomId=${encodeURIComponent(roomId)}`, {
      signal: ac.signal,
      cache: 'no-store',
    });
    if (!r.ok) return false;
    const data = await r.json();
    return !!data.exists;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export default function Page() {
  const router = useRouter();

  // Keep particles client-only to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [sessionType, setSessionType] = useState<SessionType>(null);
  const [formData, setFormData] = useState<{ nickname: string; sessionCode: string; language: string }>({
    nickname: '',
    sessionCode: '',
    language: 'javascript', // Default to 'javascript'
  });
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // ---- GSAP card resize wiring ----
  const cardRef = useRef<HTMLDivElement | null>(null);
  const prevHeightRef = useRef<number | null>(null);

  const captureCardHeight = () => {
    const el = cardRef.current;
    if (el) prevHeightRef.current = el.offsetHeight;
  };

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const from = prevHeightRef.current;
    if (from == null) return;

    const to = el.offsetHeight;
    if (from === to) {
      prevHeightRef.current = null;
      return;
    }

    gsap.fromTo(
      el,
      { height: from },
      {
        height: to,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => { gsap.set(el, { height: 'auto' }); },
      }
    );

    prevHeightRef.current = null;
  }, [sessionType]);

  // Fade/slide-in the join section when it mounts
  const joinSectionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (sessionType === 'join' && joinSectionRef.current) {
      gsap.fromTo(
        joinSectionRef.current,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.out' }
      );
    }
  }, [sessionType]);

  // ---- Form bits ----
  const disableJoinSubmit = useMemo(() => {
    return joining || !(formData.nickname.trim() && formData.sessionCode.trim());
  }, [joining, formData.nickname, formData.sessionCode]);

  // JOIN submit (validate before nav)
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const name = formData.nickname.trim();
    if (!name) return setErr('Please enter your nickname');

    const ridInput = formData.sessionCode;
    const rid = extractRoomId(ridInput);
    if (!rid) return setErr('Please paste a valid invite link or code.');

    setJoining(true);
    const ok = await roomExists(rid);
    setJoining(false);

    if (!ok) return setErr('That room is not available (not found or full).');

    router.push(`/room/${rid}?name=${encodeURIComponent(name)}&lang=${encodeURIComponent(formData.language)}`);
  }

  // CREATE click (validate before nav)
  const onCreate = async () => {
    setErr(null);
    const name = formData.nickname.trim();
    if (!name) return setErr('Please enter your nickname');

    setCreating(true);
    const id = await createRoomOnServer();
    setCreating(false);

    if (!id) return setErr('Could not create a new room. Please try again.');
    router.push(`/session/${id}?name=${encodeURIComponent(name)}&lang=${encodeURIComponent(formData.language)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Static blobs (SSR-safe) */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Particles: client-only to avoid hydration issues */}
      {isMounted && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <div
              key={`b-${i}`}
              className="absolute bg-blue-400/20 rounded-full animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: '-2px',
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${Math.random() * 8 + 12}s`,
              }}
            />
          ))}
          {[...Array(40)].map((_, i) => (
            <div
              key={`w-${i}`}
              className="absolute bg-white/10 rounded-full animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: '-2px',
                width: `${Math.random() * 1.5 + 0.5}px`,
                height: `${Math.random() * 1.5 + 0.5}px`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${Math.random() * 12 + 18}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* IMPORTANT: overflow-hidden so height tween looks clean */}
      <Card
        ref={cardRef}
        className="w-full max-w-md z-10 bg-slate-900/40 backdrop-blur-xl border border-blue-500/30 shadow-2xl shadow-blue-500/20 relative overflow-hidden"
      >
        {/* Glass overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-lg pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/5 to-transparent rounded-lg pointer-events-none" />

        <CardHeader className="text-center pb-2 relative z-10">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 backdrop-blur-sm">
            <Code className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            CodeCollab
          </CardTitle>
          <CardDescription className="text-slate-300">
            Join the collaborative programming experience
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          {/* Features (no Themes) */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10 hover:scale-105 transition-all duration-300">
              <Users className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-blue-300">Collaborate</p>
              <p className="text-xs text-blue-400/70">Up to 6 users</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/20 backdrop-blur-sm border border-green-500/30 shadow-lg shadow-green-500/10 hover:scale-105 transition-all duration-300">
              <Zap className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-green-300">Live Coding</p>
              <p className="text-xs text-green-400/70">Real-time sync</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 shadow-lg shadow-purple-500/10 hover:scale-105 transition-all duration-300">
              <PenTool className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-purple-300">Whiteboard</p>
              <p className="text-xs text-purple-400/70">Draw together</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm font-medium text-slate-200">
                Nickname
              </Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Your coding alias"
                value={formData.nickname}
                onChange={(e) => setFormData((p) => ({ ...p, nickname: e.target.value }))}
                className="bg-slate-800/60 backdrop-blur-sm border border-blue-500/40 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/50 shadow-lg shadow-blue-500/10"
                required
              />
            </div>

            {/* Preferred Language Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-medium text-slate-200">
                Preferred Programming Language
              </Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}>
                <SelectTrigger className="w-full bg-slate-800/60 backdrop-blur-sm border border-purple-500/40 text-white focus:border-purple-400 focus:ring-purple-400/50 shadow-lg shadow-purple-500/10 rounded-md px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-400 border-slate-600">
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!sessionType && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-200">Choose an option</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCreate}
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
                      captureCardHeight();
                      setSessionType('join');
                    }}
                    className="bg-slate-800/60 backdrop-blur-sm border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-400 transition-transform duration-300 active:scale-[0.98]"
                  >
                    Join Session
                  </Button>
                </div>
              </div>
            )}

            {sessionType === 'join' && (
              <div ref={joinSectionRef} className="space-y-2">
                <Label htmlFor="sessionCode" className="text-sm font-medium text-slate-200">
                  Session Code
                </Label>
                <Input
                  id="sessionCode"
                  type="text"
                  placeholder="Paste invite URL or code"
                  value={formData.sessionCode}
                  onChange={(e) => setFormData((p) => ({ ...p, sessionCode: e.target.value }))}
                  className="bg-slate-800/60 backdrop-blur-sm border border-cyan-500/40 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-cyan-400/50 shadow-lg shadow-cyan-500/10"
                  required
                />
              </div>
            )}

            {sessionType === 'join' && (
              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={disableJoinSubmit}
                  aria-busy={joining}
                  className="w-full backdrop-blur-sm text-white font-medium py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg border bg-gradient-to-r from-cyan-600/80 to-cyan-500/80 hover:from-cyan-700/90 hover:to-cyan-600/90 shadow-cyan-500/30 border-cyan-400/30"
                >
                  {joining ? 'Checking…' : 'Join Session'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    captureCardHeight();
                    setSessionType(null);
                    setFormData((p) => ({ ...p, sessionCode: '' }));
                    setErr(null);
                  }}
                  className="w-full text-slate-400 hover:text-slate-300 hover:bg-slate-800/40"
                >
                  Back
                </Button>
              </div>
            )}
          </form>

          {err && <p className="flex justify-center text-sm text-red-400">{err}</p>}

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              No data is stored permanently. Your session is temporary.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
