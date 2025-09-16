import { FaCode, FaPython, FaJava, FaCogs, FaFile } from 'react-icons/fa';
import { PiFileCpp, PiFileTxt } from "react-icons/pi";
import { IoLogoJavascript } from "react-icons/io";

export const MAX_PARTICIPANTS = 6;

export const USER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

export const LANGUAGES = {
  javascript: {
    name: "JavaScript",
    extension: "js",
    icon: IoLogoJavascript,
    version: "18.15.0" // Most recent LTS version as of Sep 2025
  },
  python: {
    name: "Python",
    extension: "py",
    icon: FaPython,
    version: "3.10.0" // Example version
  },
  java: {
    name: "Java",
    extension: "java",
    icon: FaJava,
    version: "15.0.2" // Example version
  },
  cpp: {
    name: "C++",
    extension: "cpp",
    icon: FaCode,
    version: "10.2.0" // Example version
  },
  txt: {
    name: "Plain Text",
    extension: "txt",
    icon: PiFileCpp,
    version: "" // Not applicable for plain text
  }
};

export const DEFAULT_CODE = {
  javascript: `// A simple JavaScript file
console.log("Hello, World!");`,
  python: `# A simple Python file
print("Hello, World!")`,
  java: `// A simple Java file
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  cpp: `// A simple C++ file
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
  txt: `This is a plain text file.`
};