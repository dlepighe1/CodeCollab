'use client';

import React from 'react';

interface OutputProps {
  output: string;
}

const Output: React.FC<OutputProps> = ({ output }) => {
  if (!output || output.trim() === '') {
    return (
      <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800/50 p-4 text-slate-400 font-mono text-sm overflow-y-auto">
        <p className="text-white font-semibold">Output</p>
        <div className="mt-2 text-slate-500 italic">
          Click Run Code to see the output here ...
        </div>
      </div>
    );
  }

  const renderOutput = () => {
    // Regex to capture key parts: [Running], the filename, [Done], "Exited with...", exit code, and time
    const regex = /(\[Running\])\s(.*?)(\n\n[\s\S]*?)(\[Done\])\s(.*?)(code=(0|1))\s(.*)/s;
    const match = output.match(regex);

    if (match) {
      const [, runningTag, filename, codeOutput, doneTag, exitedWith, exitCode, , timeElapsed] = match;

      return (
        <>
          {/* [Running] filename */}
          <span className="text-blue-400 font-semibold">{runningTag}</span>
          <span className="text-orange-300 font-semibold"> {filename}</span>

          {/* Code output */}
          <span className="text-slate-400 whitespace-pre-wrap">{codeOutput}</span>

          {/* [Done] Exited with code=X in Y seconds */}
          <span className="text-blue-400 font-semibold">{doneTag}</span>
          <span className="text-orange-300 font-semibold"> {exitedWith}</span>
          
          {/* Exit code coloring */}
          <span className={exitCode === 'code=0' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {exitCode}
          </span>
          <span className="text-orange-300 font-semibold"> {timeElapsed}</span>
        </>
      );
    }

    // Fallback for simple errors or non-standard output
    return (
      <pre className="text-red-400 font-semibold whitespace-pre-wrap">
        {output}
      </pre>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800/50 p-4 text-slate-400 font-mono text-sm overflow-y-auto">
      <p className="text-white font-semibold">Output</p>
      <div className="mt-2">
        {renderOutput()}
      </div>
    </div>
  );
};

export default Output;