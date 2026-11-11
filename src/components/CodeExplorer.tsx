import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  FolderTree, 
  Cpu, 
  RotateCw, 
  Bell, 
  Database,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { ANDROID_PROJECT_FILES, ProjectFile } from '../data/androidProjectFiles';
import { exportAndroidProjectZip } from '../utils/zipExporter';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(ANDROID_PROJECT_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      await exportAndroidProjectZip();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner with Download CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-800/40 rounded-xl">
        <div>
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            Исходный код проекта Wear OS (Java)
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Полноценный проект для Android Studio с чистым Java кодом, поддержкой аппаратного безеля Samsung, пробуждением экрана каждые 10 минут и авто-подтверждением без нажатий.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-sky-600/30 whitespace-nowrap cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Создание архива...' : 'Скачать проект (ZIP)'}</span>
        </button>
      </div>

      {/* 4 Architectural Core Concepts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1.5">
            <RotateCw className="w-4 h-4 shrink-0" />
            <span>Вращение безеля</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Использует <code className="text-sky-300">onGenericMotionEvent</code> с <code className="text-sky-300">MotionEvent.AXIS_SCROLL</code> для чтения аппаратных щелчков безеля Samsung.
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1.5">
            <Cpu className="w-4 h-4 shrink-0" />
            <span>Zero-Click выбор</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            <code className="text-amber-300">Handler.postDelayed(1500ms)</code> автоматически фиксирует активность при остановке безеля. Никаких тапов!
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5">
            <Bell className="w-4 h-4 shrink-0" />
            <span>10-минутный сигнал</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            <code className="text-emerald-300">AlarmManager</code> будит процессор, включает вибрацию и зажигает экран поверх блокировки часов.
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-purple-400 font-semibold mb-1.5">
            <Database className="w-4 h-4 shrink-0" />
            <span>Локальная база Room</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Каждый 10-минутный снапшот сохраняется в базу SQLite на часах для подсчета затраченного времени и статистики дня.
          </p>
        </div>
      </div>

      {/* Main Code Viewer with Sidebar File Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-[580px]">
        {/* Left: File Tree */}
        <div className="lg:col-span-4 bg-slate-900/70 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 flex flex-col">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <FolderTree className="w-4 h-4 text-sky-400" />
            <span>Структура проекта</span>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[520px] pr-1">
            {ANDROID_PROJECT_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono font-medium truncate">
                    {file.category === 'script' ? (
                      <Terminal className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    ) : (
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                    )}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate pl-5">
                    {file.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-slate-950">
          {/* File Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono font-medium text-slate-200 truncate">
                {selectedFile.path}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                {selectedFile.language}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>

          {/* Description banner */}
          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 text-[11px] text-slate-400">
            {selectedFile.description}
          </div>

          {/* Code with Line Numbers */}
          <div className="flex-1 overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-slate-300 max-h-[580px]">
            <pre className="table w-full">
              {selectedFile.content.split('\n').map((line, idx) => (
                <div key={idx} className="table-row hover:bg-slate-900/50">
                  <span className="table-cell select-none pr-4 text-right text-slate-600 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre">
                    {line}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
