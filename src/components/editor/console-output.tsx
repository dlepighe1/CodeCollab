'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from '@/components/lib/socketClient';

interface OutputProps {
  output: string;

  /** NEW — if provided, component can broadcast/subscribe console text */
  roomId?: string;

  /**
   * NEW — when true, the component subscribes to socket updates and renders
   * the shared console. When false/omitted, it renders `output` prop and
   * broadcasts changes it receives via props.
   */
  live?: boolean;
}

const Output: React.FC<OutputProps> = ({ output, roomId, live = false }) => {
  const [liveOutput, setLiveOutput] = useState<string>('');
  const lastSentRef = useRef<string>('');

  // In controlled mode, broadcast prop changes
  useEffect(() => {
    if (!roomId || live) return;
    if (output !== lastSentRef.current) {
      socket.emit('console:update', { roomId, output });
      lastSentRef.current = output;
    }
  }, [output, roomId, live]);

  // In live mode, subscribe to updates and display them
  useEffect(() => {
    if (!roomId || !live) return;

    const onConsoleUpdate = (payload: { roomId: string; output: string }) => {
      if (payload.roomId !== roomId) return;
      setLiveOutput(payload.output);
    };

    socket.on('console:update', onConsoleUpdate);
    return () => {
      socket.off('console:update', onConsoleUpdate);
    };
  }, [roomId, live]);

  const text = live ? liveOutput : output;

  if (!text || text.trim() === '') {
    return (
      <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800/50 p-4 text-slate-400 font-mono text-sm overflow-y-auto">
        <p className="text-white font-semibold">Output</p>
        <div className="mt-2 text-slate-500 italic">
          Click Run Code to see the output here ...
        </div>
      </div>
    );
  }

  const rendered = useMemo(() => {
    // Regex to capture key parts: [Running], filename, body, [Done], "Exited with...", exit code, and time
    const regex = /(\[Running\])\s(.*?)(\n\n[\s\S]*?)(\[Done\])\s(.*?)(code=(0|1))\s(.*)/s;
    const match = text.match(regex);

    if (match) {
      const [, runningTag, filename, codeOutput, doneTag, exitedWith, exitCode, , timeElapsed] = match;

      return (
        <>
          <span className="text-blue-400 font-semibold">{runningTag}</span>
          <span className="text-orange-300 font-semibold"> {filename}</span>
          <span className="text-slate-400 whitespace-pre-wrap">{codeOutput}</span>
          <span className="text-blue-400 font-semibold">{doneTag}</span>
          <span className="text-orange-300 font-semibold"> {exitedWith}</span>
          <span className={exitCode === 'code=0' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {exitCode}
          </span>
          <span className="text-orange-300 font-semibold"> {timeElapsed}</span>
        </>
      );
    }

    return (
      <pre className="text-red-400 font-semibold whitespace-pre-wrap">
        {text}
      </pre>
    );
  }, [text]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800/50 p-4 text-slate-400 font-mono text-sm overflow-y-auto">
      <p className="text-white font-semibold">Output</p>
      <div className="mt-2">
        {rendered}
      </div>
    </div>
  );
};

export default Output;
