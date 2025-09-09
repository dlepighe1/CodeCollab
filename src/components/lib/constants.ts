import { FaCode, FaPython, FaJava, FaCogs, FaFile } from 'react-icons/fa';
import { PiFileCpp, PiFileTxt } from "react-icons/pi";
import { IoLogoJavascript } from "react-icons/io";

export const LANGUAGES = {
  javascript: { name: 'JavaScript', extension: 'js', icon: IoLogoJavascript, logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png' },
  python: { name: 'Python', extension: 'py', icon: FaPython, logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg' },
  java: { name: 'Java', extension: 'java', icon: FaJava, logo: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Java_logo_icon.png' },
  cpp: { name: 'C++', extension: 'cpp', icon: PiFileCpp, logo: 'https://upload.wikimedia.org/wikipedia/commons/1/18/ISO_C%2B%2B_Logo.svg' },
  txt: { name: 'TXT', extension: 'txt', icon: PiFileTxt, logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/OOjs_UI_icon_edit-ltr-progress.svg' } 
};
