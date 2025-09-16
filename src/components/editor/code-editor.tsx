import { Editor } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, language, onChange }) => {
  return (
    <Editor
      theme="vs-dark"
      language={language}
      value={value}
      onChange={onChange}
      loading={
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
          Loading editor ... 
        </div>
      }
      options={{
        minimap: {enabled: true}, 
        readOnly: false, 
        wordWrap: 'off', 
        scrollBeyondLastLine: false, 
        fontSize: 14, 
        fontFamily: 'Fira Code', 
        fontLigatures: true, 
        tabSize: 4, 
        automaticLayout: true, 
        smoothScrolling: true, 
        cursorSmoothCaretAnimation: 'on', 
      }}
    />
  );
};

export default CodeEditor;