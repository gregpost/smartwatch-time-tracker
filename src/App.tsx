import React, { useState, useEffect } from 'react';
import { 
  Download, 
  RotateCw, 
  FileCode, 
  BarChart3, 
  BookOpen, 
  Sparkles,
  Watch,
  FolderKanban,
  Code2,
  Languages,
  Briefcase,
  Coins,
  Utensils,
  Dumbbell,
  Coffee,
  Home
} from 'lucide-react';
import { ACTIVITIES, ActivityLogEntry } from './types/watch';
import { GalaxyWatchSimulator } from './components/GalaxyWatchSimulator';
import { CodeExplorer } from './components/CodeExplorer';
import { ActivityTimeline } from './components/ActivityTimeline';
import { WatchGuide } from './components/WatchGuide';
import { GitSyncBar } from './components/GitSyncBar';
import { exportAndroidProjectZip } from './utils/zipExporter';

type ActiveTab = 'simulator' | 'code' | 'timeline' | 'guide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Load saved logs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('galaxy_watch_tracker_logs');
      if (saved) {
        setLogs(JSON.parse(saved));
      } else {
        // Seed 5 sample morning intervals so the chart looks rich right away
        seedSampleLogs();
      }
    } catch {
      // failsafe
    }
  }, []);

  const saveLogs = (newLogs: ActivityLogEntry[]) => {
    setLogs(newLogs);
    try {
      localStorage.setItem('galaxy_watch_tracker_logs', JSON.stringify(newLogs));
    } catch {
      // failsafe
    }
  };

  const handleLogActivity = (entry: ActivityLogEntry) => {
    saveLogs([entry, ...logs]);
    // Auto commit and push activity change to GitHub repository
    fetch('/api/git/commit-and-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: `Фиксация активности "${entry.activityName}" на интервале ${entry.formattedTime}`,
        postfix: 'activity-log'
      })
    }).catch(() => {});
  };

  const handleClearLogs = () => {
    saveLogs([]);
    fetch('/api/git/commit-and-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Очистка журнала интервалов активности',
        postfix: 'clear-logs'
      })
    }).catch(() => {});
  };

  const seedSampleLogs = () => {
    const now = new Date();
    const sampleIds = [1, 1, 2, 2, 3, 7, 8, 1, 6, 9];
    const generated: ActivityLogEntry[] = sampleIds.map((actId, index) => {
      const act = ACTIVITIES.find(a => a.id === actId) || ACTIVITIES[0];
      const d = new Date(now.getTime() - (index + 1) * 10 * 60 * 1000);
      return {
        id: `sample-${Date.now()}-${index}`,
        timestamp: d.toISOString(),
        formattedTime: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        activityId: act.id,
        activityName: act.name,
        color: act.color,
        intervalMinutes: 10
      };
    });
    saveLogs(generated);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Bar Contract (§2) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Watch className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Galaxy Watch Bezel Tracker
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Симулятор часов</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Исходный код (Java)</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'timeline' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Журнал и статистика</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide' ? 'text-sky-400 border-b-2 border-sky-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Инструкция по установке</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:scale-95 rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-sky-600/30 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Сборка...' : 'Скачать проект (ZIP)'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex items-center justify-around px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`py-1 px-2 rounded font-medium ${activeTab === 'simulator' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400'}`}
        >
          Симулятор
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`py-1 px-2 rounded font-medium ${activeTab === 'code' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400'}`}
        >
          Java код
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-1 px-2 rounded font-medium ${activeTab === 'timeline' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400'}`}
        >
          Журнал ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`py-1 px-2 rounded font-medium ${activeTab === 'guide' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400'}`}
        >
          Гайд
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Prominent Git Auto-Sync & Versioning Bar */}
        <GitSyncBar />

        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Watch Simulator Viewport */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <GalaxyWatchSimulator 
                onLogActivity={handleLogActivity}
                logs={logs}
              />
            </div>

            {/* Right: 10 Activities List & Live Telemetry Info */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              
              {/* Concept explanation card */}
              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Принцип работы без нажатий</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Каждые 10 минут часы <strong>коротко вибрируют</strong> и <strong>зажигают экран</strong>. Вы просто поворачиваете <strong>безель</strong> (колёсико по ободу экрана) на нужное занятие. Через 1.5 секунды после остановки выбор фиксируется сам — нажимать ничего не нужно!
                </p>
              </div>

              {/* The 10 Activities Reference Panel */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    10 процессов деятельности
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">1 шаг = 36° безеля</span>
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[460px] pr-1">
                  {ACTIVITIES.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0 font-mono"
                          style={{ backgroundColor: act.color }}
                        >
                          {act.number}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-white block truncate">
                            {act.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {act.description}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'code' && <CodeExplorer />}

        {activeTab === 'timeline' && (
          <ActivityTimeline 
            logs={logs}
            onClearLogs={handleClearLogs}
            onSeedSampleData={seedSampleLogs}
          />
        )}

        {activeTab === 'guide' && <WatchGuide />}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <div>
          Wear OS Java проект для Samsung Galaxy Watch 4 / 5 / 6 / 7 (Classic & Standard)
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Аппаратный поворотный безель</span>
          <span>·</span>
          <span>Zero-Click выбор</span>
          <span>·</span>
          <span>10-минутный интервал</span>
        </div>
      </footer>
    </div>
  );
}
