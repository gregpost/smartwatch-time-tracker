import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FolderKanban, 
  Code2, 
  Languages, 
  Briefcase, 
  Coins, 
  Utensils, 
  Dumbbell, 
  Coffee, 
  Home, 
  Sparkles,
  RotateCw, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Zap, 
  Check, 
  Clock, 
  Play,
  Rotate3d
} from 'lucide-react';
import { ACTIVITIES, ActivityItem, ActivityLogEntry } from '../types/watch';
import { soundHaptics } from '../utils/audioHaptics';

interface GalaxyWatchSimulatorProps {
  onLogActivity: (entry: ActivityLogEntry) => void;
  logs: ActivityLogEntry[];
}

export const GalaxyWatchSimulator: React.FC<GalaxyWatchSimulatorProps> = ({
  onLogActivity,
  logs
}) => {
  // Watch state
  const [screenState, setScreenState] = useState<'prompt' | 'ambient' | 'confirmed'>('prompt');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [bezelRotationAngle, setBezelRotationAngle] = useState<number>(0);
  const [autoConfirmProgress, setAutoConfirmProgress] = useState<number>(100);
  const [isVibrating, setIsVibrating] = useState<boolean>(false);
  
  // Timer & Intervals
  const [timerSpeed, setTimerSpeed] = useState<'real' | 'fast15' | 'fast30'>('fast15');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Sound & Haptics toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // References for dragging rotary bezel
  const watchCenterRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastAngleRef = useRef<number>(0);
  const autoConfirmTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const AUTO_CONFIRM_MS = 1500;

  // Icon mapping
  const renderActivityIcon = (iconName: string, className: string = 'w-6 h-6') => {
    switch (iconName) {
      case 'FolderKanban': return <FolderKanban className={className} />;
      case 'Code2': return <Code2 className={className} />;
      case 'Languages': return <Languages className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'Coins': return <Coins className={className} />;
      case 'Utensils': return <Utensils className={className} />;
      case 'Dumbbell': return <Dumbbell className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      case 'Home': return <Home className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  // Clock updater
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Interval Countdown (Simulating 10-minute cycle or test speeds)
  useEffect(() => {
    if (screenState !== 'ambient') return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Trigger 10-minute prompt!
          trigger10MinutePrompt();
          const nextSec = timerSpeed === 'real' ? 600 : timerSpeed === 'fast15' ? 15 : 30;
          return nextSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screenState, timerSpeed]);

  // Zero-Click Auto-Confirmation Engine:
  // When user stops turning bezel, runs a 1.5s countdown and automatically logs activity without clicking!
  const scheduleAutoConfirm = useCallback(() => {
    if (autoConfirmTimerRef.current) {
      window.clearTimeout(autoConfirmTimerRef.current);
    }
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }

    const startTime = Date.now();
    setAutoConfirmProgress(100);

    // Smooth countdown progress bar
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / AUTO_CONFIRM_MS) * 100);
      setAutoConfirmProgress(remainingPercent);

      if (remainingPercent <= 0 && progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }, 25);

    // Auto-confirm execution after 1500ms
    autoConfirmTimerRef.current = window.setTimeout(() => {
      commitActivitySelection();
    }, AUTO_CONFIRM_MS);
  }, [selectedIndex]);

  // Trigger 10-minute prompt with haptic & vibration
  const trigger10MinutePrompt = () => {
    setIsVibrating(true);
    soundHaptics.playVibrationAlert();
    setScreenState('prompt');

    setTimeout(() => {
      setIsVibrating(false);
    }, 600);

    scheduleAutoConfirm();
  };

  // Commit selected activity automatically
  const commitActivitySelection = () => {
    const act = ACTIVITIES[selectedIndex];
    soundHaptics.playConfirmSound();

    const now = new Date();
    const newLog: ActivityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      activityId: act.id,
      activityName: act.name,
      color: act.color,
      intervalMinutes: 10
    };

    onLogActivity(newLog);
    setScreenState('confirmed');

    // Wait 900ms showing "Записано!", then switch back to ambient watchface
    setTimeout(() => {
      setScreenState('ambient');
      const resetSec = timerSpeed === 'real' ? 600 : timerSpeed === 'fast15' ? 15 : 30;
      setSecondsRemaining(resetSec);
    }, 900);
  };

  // Rotate bezel step (direction: +1 clockwise, -1 counter-clockwise)
  const stepBezel = useCallback((direction: number) => {
    setSelectedIndex(prev => {
      const total = ACTIVITIES.length;
      const next = (prev + direction + total) % total;
      soundHaptics.playBezelTick(next);
      return next;
    });

    setBezelRotationAngle(prev => prev + direction * 36);

    // If watch is in ambient, turning bezel wakes it up!
    if (screenState === 'ambient') {
      setScreenState('prompt');
    }

    // Reset auto-confirm delay
    scheduleAutoConfirm();
  }, [screenState, scheduleAutoConfirm]);

  // Mouse wheel rotation over watch
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    if (Math.abs(delta) > 5) {
      stepBezel(delta > 0 ? 1 : -1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        stepBezel(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        stepBezel(-1);
      } else if (e.key === ' ' && screenState === 'ambient') {
        trigger10MinutePrompt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepBezel, screenState]);

  // Mouse / Touch Bezel Circular Drag Interaction
  const calculateAngle = (clientX: number, clientY: number) => {
    if (!watchCenterRef.current) return 0;
    const rect = watchCenterRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - centerY, clientX - centerX);
    return (rad * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastAngleRef.current = calculateAngle(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const currentAngle = calculateAngle(e.clientX, e.clientY);
    let delta = currentAngle - lastAngleRef.current;

    // Handle crossing -180 / 180 boundary
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    // A notch triggers every ~20 degrees of drag
    if (Math.abs(delta) >= 20) {
      const step = delta > 0 ? 1 : -1;
      stepBezel(step);
      lastAngleRef.current = currentAngle;
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const currentActivity = ACTIVITIES[selectedIndex];
  const lastLogged = logs.length > 0 ? logs[0] : null;

  return (
    <div className="flex flex-col items-center">
      {/* Simulation Quick Toolbar */}
      <div className="w-full max-w-xl flex flex-wrap items-center justify-between gap-3 mb-6 p-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Режим таймера:</span>
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={() => { setTimerSpeed('fast15'); setSecondsRemaining(15); }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timerSpeed === 'fast15' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Демо 15 сек
            </button>
            <button
              onClick={() => { setTimerSpeed('fast30'); setSecondsRemaining(30); }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timerSpeed === 'fast30' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Демо 30 сек
            </button>
            <button
              onClick={() => { setTimerSpeed('real'); setSecondsRemaining(600); }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timerSpeed === 'real' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Реальные 10 мин
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundHaptics.setSoundEnabled(next);
            }}
            title={soundEnabled ? 'Выключить звук кликов' : 'Включить звук кликов'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 flex items-center gap-1"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span>{soundEnabled ? 'Звук ВКЛ' : 'Звук ВЫКЛ'}</span>
          </button>

          <button
            onClick={trigger10MinutePrompt}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-medium rounded-lg flex items-center gap-1.5 transition-all shadow-sm shadow-sky-600/30"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Вибросигнал 10 мин</span>
          </button>
        </div>
      </div>

      {/* Main Samsung Galaxy Watch Physical Chassis */}
      <div className="relative flex flex-col items-center select-none">
        {/* Watch Strap Top */}
        <div className="w-36 h-14 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl shadow-inner border-t border-x border-slate-700/60 relative overflow-hidden">
          <div className="absolute inset-x-0 top-3 h-1 bg-slate-700/40" />
          <div className="absolute inset-x-0 top-7 h-1 bg-slate-700/40" />
          <div className="absolute inset-x-0 top-11 h-1 bg-slate-700/40" />
        </div>

        {/* Watch Case Frame (Stainless Steel Chassis) */}
        <div 
          ref={watchCenterRef}
          onWheel={handleWheel}
          className={`relative w-[370px] h-[370px] sm:w-[410px] sm:h-[410px] rounded-full p-3.5 transition-transform duration-100 ${
            isVibrating ? 'animate-[bounce_0.08s_infinite]' : ''
          }`}
          style={{
            background: 'radial-gradient(circle at 30% 25%, #475569 0%, #1e293b 50%, #0f172a 100%)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Side Hardware Buttons on Samsung Galaxy Watch */}
          {/* Top Button: Home / Wake */}
          <button 
            onClick={() => {
              if (screenState === 'ambient') trigger10MinutePrompt();
              else setScreenState('ambient');
            }}
            title="Верхняя кнопка часов: Домой / Пробуждение"
            className="absolute -right-3.5 top-[28%] w-4 h-12 rounded-r-md bg-gradient-to-r from-slate-600 to-slate-400 border-y border-r border-slate-500/80 shadow-md cursor-pointer hover:brightness-110 active:translate-x-[-1px] transition-all"
          />
          {/* Bottom Button: Back */}
          <button 
            onClick={() => setScreenState('ambient')}
            title="Нижняя кнопка часов: Назад"
            className="absolute -right-3.5 bottom-[28%] w-4 h-12 rounded-r-md bg-gradient-to-r from-slate-600 to-slate-400 border-y border-r border-slate-500/80 shadow-md cursor-pointer hover:brightness-110 active:translate-x-[-1px] transition-all"
          />

          {/* PHYSICAL ROTATING BEZEL (ВРАЩАЮЩИЙСЯ БЕЗЕЛЬ SAMSUNG) */}
          <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full h-full rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center p-3"
            style={{
              background: 'radial-gradient(circle, #0f172a 40%, #334155 85%, #475569 100%)',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.9), 0 4px 10px rgba(0,0,0,0.6)'
            }}
          >
            {/* Bezel Ribbed Edge (Milled Knurling Grooves) */}
            <div 
              className="absolute inset-0 rounded-full pointer-events-none transition-transform duration-75 ease-out"
              style={{
                transform: `rotate(${bezelRotationAngle}deg)`
              }}
            >
              {/* 360-degree ticks around bezel rim */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = i * 6;
                const isMajor = i % 6 === 0; // 10 major points for activities
                return (
                  <div
                    key={i}
                    className="absolute top-0 left-1/2 -translate-x-1/2 origin-[50%_185px] sm:origin-[50%_205px]"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div 
                      className={`w-0.5 rounded-full ${
                        isMajor 
                          ? 'h-3 bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.8)]' 
                          : 'h-1.5 bg-slate-500/50'
                      }`} 
                    />
                  </div>
                );
              })}

              {/* Physical Bezel Dot Marker at North */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            </div>

            {/* SUPER AMOLED CIRCULAR DISPLAY (КРУГЛЫЙ ЭКРАН SAMSUNG 450x450) */}
            <div className="relative w-full h-full rounded-full bg-black overflow-hidden border border-slate-800 flex flex-col items-center justify-center shadow-inner">
              
              {/* Screen Content State 1: Prompt Mode (When vibrating & choosing activity) */}
              {screenState === 'prompt' && (
                <div className="relative w-full h-full flex flex-col items-center justify-between p-6 text-white text-center">
                  
                  {/* Circular Outer Dial displaying all 10 activities */}
                  <div className="absolute inset-2 pointer-events-none">
                    {ACTIVITIES.map((act, idx) => {
                      const angle = (idx * 36) - 90; // 0 at top
                      const isSelected = idx === selectedIndex;
                      const rad = (angle * Math.PI) / 180;
                      // Radius distance from center
                      const r = 135; 
                      const x = Math.cos(rad) * r;
                      const y = Math.sin(rad) * r;

                      return (
                        <div
                          key={act.id}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                          style={{
                            transform: `translate(${x}px, ${y}px) scale(${isSelected ? 1.3 : 0.85})`,
                            opacity: isSelected ? 1 : 0.45
                          }}
                        >
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors"
                            style={{
                              backgroundColor: isSelected ? act.color : 'transparent',
                              color: isSelected ? '#000000' : '#ffffff',
                              borderColor: act.color,
                              boxShadow: isSelected ? `0 0 10px ${act.color}` : 'none'
                            }}
                          >
                            {act.number}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Top: Header hint */}
                  <div className="z-10 mt-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Что сейчас делаете?
                    </span>
                  </div>

                  {/* Center Card: Highlighted Activity */}
                  <div className="z-10 flex flex-col items-center justify-center px-4 max-w-[240px]">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-2.5 transition-transform duration-200"
                      style={{
                        backgroundColor: currentActivity.bgColor,
                        color: currentActivity.color,
                        boxShadow: `0 0 20px ${currentActivity.bgColor}`
                      }}
                    >
                      {renderActivityIcon(currentActivity.iconName, 'w-7 h-7')}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-mono text-slate-400 font-bold">
                        #{currentActivity.number}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold leading-tight tracking-tight text-white line-clamp-2">
                        {currentActivity.name}
                      </h3>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                      {currentActivity.description}
                    </p>

                    {/* Zero-Click Auto-Confirm Notice & Countdown Bar */}
                    <div className="w-full flex flex-col items-center mt-1">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-sky-400 mb-1">
                        <Rotate3d className="w-3 h-3 animate-spin text-sky-400" />
                        <span>Авто-выбор через {((autoConfirmProgress / 100) * 1.5).toFixed(1)}с</span>
                      </div>
                      
                      {/* Linear countdown bar */}
                      <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sky-400 rounded-full transition-all duration-75"
                          style={{ width: `${autoConfirmProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Bezel rotation guide */}
                  <div className="z-10 mb-2">
                    <p className="text-[10px] text-slate-500 font-medium">
                      Покрутите безель · Нажимать ничего не нужно
                    </p>
                  </div>

                  {/* Circular SVG Auto-Confirm Progress Ring around edge */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="46%"
                      fill="none"
                      stroke={currentActivity.color}
                      strokeWidth="3"
                      strokeDasharray="940"
                      strokeDashoffset={940 - (940 * autoConfirmProgress) / 100}
                      strokeLinecap="round"
                      className="opacity-70 transition-all duration-75"
                    />
                  </svg>
                </div>
              )}

              {/* Screen Content State 2: Confirmed Flash */}
              {screenState === 'confirmed' && (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-white text-center bg-black animate-[fadeIn_0.2s_ease-out]">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-3 text-emerald-400 bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                  >
                    <Check className="w-9 h-9 stroke-[3]" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Записано!</h4>
                  <p className="text-xs text-sky-400 font-medium">
                    {currentActivity.number}. {currentActivity.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-3">
                    Экран гаснет до следующего интервала...
                  </p>
                </div>
              )}

              {/* Screen Content State 3: Ambient Watchface Mode */}
              {screenState === 'ambient' && (
                <div className="relative w-full h-full flex flex-col items-center justify-between p-7 text-white text-center">
                  {/* Top info: Battery & Status */}
                  <div className="flex items-center justify-between w-full px-5 text-[11px] text-slate-400 font-mono">
                    <span className="text-emerald-400 font-medium">84%</span>
                    <span className="text-sky-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      10m
                    </span>
                  </div>

                  {/* Center Time & Next Interval */}
                  <div className="flex flex-col items-center my-auto">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-white">
                      {currentTime || '12:00:00'}
                    </span>
                    
                    <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span>
                        Вибро через: <strong className="font-mono text-sky-300 font-semibold">
                          {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
                        </strong>
                      </span>
                    </div>

                    {lastLogged && (
                      <div className="mt-2 text-[10px] text-slate-400">
                        Последняя: <span style={{ color: lastLogged.color }}>{lastLogged.activityName}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Touch hint */}
                  <button 
                    onClick={trigger10MinutePrompt}
                    className="text-[10px] text-slate-500 hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Поверните безель или нажмите</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Watch Strap Bottom */}
        <div className="w-36 h-14 bg-gradient-to-t from-slate-800 to-slate-900 rounded-b-2xl shadow-inner border-b border-x border-slate-700/60 relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-3 h-1 bg-slate-700/40" />
          <div className="absolute inset-x-0 bottom-7 h-1 bg-slate-700/40" />
          <div className="absolute inset-x-0 bottom-11 h-1 bg-slate-700/40" />
        </div>
      </div>

      {/* Manual Bezel Controls & Instructions */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => stepBezel(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>Безель против часовой (←)</span>
          </button>

          <button
            onClick={() => stepBezel(1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-all shadow-sm"
          >
            <span>Безель по часовой (→)</span>
            <RotateCw className="w-4 h-4 text-sky-400" />
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center max-w-md">
          <strong className="text-slate-200">Подсказка:</strong> Вращайте безель мышкой по кругу, крутите колесико мыши над часами или используйте стрелки клавиатуры <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono text-[10px]">→</kbd>.
        </p>
      </div>
    </div>
  );
};
