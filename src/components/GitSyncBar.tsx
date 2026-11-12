import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Key, 
  RotateCw, 
  RefreshCw, 
  ArrowUpRight, 
  Settings, 
  History, 
  ShieldAlert, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Send
} from 'lucide-react';
import { GitSyncState, PushStatus } from '../types/gitSync';

interface GitSyncBarProps {
  onTriggerPush?: (reason?: string, postfix?: string) => Promise<void>;
}

export function GitSyncBar({ onTriggerPush }: GitSyncBarProps) {
  const [syncState, setSyncState] = useState<GitSyncState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionsOpen, setIsActionsOpen] = useState<boolean>(false);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showManualCommitModal, setShowManualCommitModal] = useState<boolean>(false);

  const [tokenInput, setTokenInput] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('Обновление параметров активности и таймлайна');
  const [manualPostfix, setManualPostfix] = useState<string>('manual-sync');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch current git sync status from backend
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/git/status');
      if (res.ok) {
        const data = await res.json();
        setSyncState(data);
      }
    } catch (err) {
      console.warn('Could not fetch git status from /api/git/status', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveAction = async (actionId: string) => {
    if (actionId === 'enter_token' || actionId === 'set_token') {
      setShowTokenModal(true);
      return;
    }

    setIsLoading(true);
    setActionFeedback('Выполнение действия: ' + actionId + '...');
    try {
      const res = await fetch('/api/git/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId })
      });
      const result = await res.json();
      if (result.success) {
        setActionFeedback('Успешно: ' + (result.message || 'Действие выполнено'));
      } else {
        setActionFeedback('Внимание: ' + (result.message || 'Требуется проверка'));
      }
      await fetchStatus();
    } catch (err: any) {
      setActionFeedback('Ошибка: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/git/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      if (res.ok) {
        setShowTokenModal(false);
        setTokenInput('');
        setActionFeedback('Токен GitHub сохранен! Повторяем автопуш...');
        // Retry push immediately
        await handleCommitAndPush('Настройка токена авторизации GitHub', 'token-setup');
      }
    } catch (err: any) {
      setActionFeedback('Ошибка сохранения токена: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitAndPush = async (customReason?: string, customPostfix?: string) => {
    setIsLoading(true);
    setActionFeedback('Выполняется коммит и автопуш...');
    try {
      const reason = customReason || manualReason;
      const postfix = customPostfix || manualPostfix;
      const res = await fetch('/api/git/commit-and-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, postfix })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setActionFeedback('✅ Автопуш успешно совершен в GitHub!');
        setShowManualCommitModal(false);
      } else if (data.status === 'auth_required') {
        setActionFeedback('⚠️ Требуется GitHub токен для завершения отправки');
        setIsActionsOpen(true);
      } else if (data.status === 'conflict') {
        setActionFeedback('⚠️ Обнаружен конфликт с удаленной веткой origin/main');
        setIsActionsOpen(true);
      }
      await fetchStatus();
    } catch (err: any) {
      setActionFeedback('Ошибка запроса: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!syncState) {
    return null;
  }

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'только что';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: PushStatus) => {
    switch (status) {
      case 'success':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Автопуш совершен</span>
          </div>
        );
      case 'conflict':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Конфликт пуша</span>
          </div>
        );
      case 'auth_required':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Key className="w-3.5 h-3.5" />
            <span>Автопуш: требуется токен</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Отправка...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-400">
            <GitCommit className="w-3.5 h-3.5" />
            <span>Синхронизация</span>
          </div>
        );
    }
  };

  const isConflictOrAuth = syncState.lastPushStatus === 'conflict' || syncState.lastPushStatus === 'auth_required';

  return (
    <div className="w-full mb-6">
      {/* Main Glassmorphic Git Sync Banner */}
      <div className={`rounded-xl border transition-all ${
        syncState.lastPushStatus === 'success' 
          ? 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700'
          : syncState.lastPushStatus === 'conflict'
          ? 'bg-rose-950/30 border-rose-800/60 shadow-lg shadow-rose-950/20'
          : 'bg-amber-950/25 border-amber-800/60 shadow-lg shadow-amber-950/20'
      } p-3.5 sm:p-4 backdrop-blur-md`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left section: Status Badge, Version with postfix, and Time */}
          <div className="flex flex-wrap items-center gap-3">
            {renderStatusBadge(syncState.lastPushStatus)}

            {/* Version Badge with Distinct Postfix */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono">
              <span className="text-slate-400 mr-1 text-[11px]">v</span>
              <span className="font-bold text-sky-400">{syncState.baseVersion || '0.1.0'}</span>
              {syncState.versionPostfix && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800/60">
                  {syncState.versionPostfix}
                </span>
              )}
            </div>

            {/* Last Push Timestamp */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatDateTime(syncState.lastPushTime)}</span>
            </div>

            {/* Commit Hash if present */}
            {syncState.lastCommitHash && (
              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                #{syncState.lastCommitHash}
              </span>
            )}
          </div>

          {/* Center/Right section: Description & Quick Action Buttons */}
          <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0">
            
            {/* Repository Link */}
            <a
              href={syncState.repoUrl || 'https://github.com/gregpost/smartwatch-time-tracker'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1 bg-slate-950/60 hover:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-800 font-medium"
              title="Открыть публичный репозиторий GitHub"
            >
              <GitBranch className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">gregpost/smartwatch-time-tracker</span>
              <span className="md:hidden">GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Manual Push Button */}
            <button
              onClick={() => setShowManualCommitModal(true)}
              disabled={isLoading}
              className="text-xs font-medium bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Запустить ручной коммит с автопушем"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Сделать пуш</span>
            </button>

            {/* History Button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="text-xs font-medium bg-slate-800/60 hover:bg-slate-700/70 text-slate-300 p-1.5 rounded-lg transition-colors border border-slate-800 cursor-pointer"
              title="История версий и коммитов"
            >
              <History className="w-4 h-4 text-slate-400" />
            </button>

            {/* Token / Settings Button */}
            <button
              onClick={() => setShowTokenModal(true)}
              className="text-xs font-medium bg-slate-800/60 hover:bg-slate-700/70 text-slate-300 p-1.5 rounded-lg transition-colors border border-slate-800 cursor-pointer"
              title="Настройки токена GitHub"
            >
              <Key className="w-4 h-4 text-amber-400" />
            </button>

            {/* Details toggle */}
            {(isConflictOrAuth || syncState.conflictDetails) && (
              <button
                onClick={() => setIsActionsOpen(!isActionsOpen)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  syncState.lastPushStatus === 'conflict'
                    ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                }`}
              >
                <span>Действия</span>
                {isActionsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Russian Comment & Status Message Line */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-300 flex items-center gap-2 truncate">
            <span className="text-slate-500 font-medium shrink-0">Описание правок:</span>
            <span className="font-medium text-slate-200 truncate italic">
              «{syncState.lastCommitMessage || 'Инициализация автопуша'}»
            </span>
          </div>

          {actionFeedback && (
            <div className="text-[11px] font-mono text-sky-400 shrink-0">
              {actionFeedback}
            </div>
          )}
        </div>

        {/* Conflict / Action Proposal Banner */}
        {(isActionsOpen || isConflictOrAuth) && syncState.suggestedActions?.length > 0 && (
          <div className="mt-3.5 p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${
                syncState.lastPushStatus === 'conflict' ? 'text-rose-400' : 'text-amber-400'
              }`} />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white">
                  {syncState.lastPushStatus === 'conflict' 
                    ? 'Обнаружен конфликт с удаленной веткой GitHub' 
                    : 'Требуется авторизация для отправки в репозиторий'}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {syncState.conflictDetails || 'Выберите одно из предложенных действий для устранения конфликта и отправки:'}
                </p>
              </div>
            </div>

            {/* Suggested Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {syncState.suggestedActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleResolveAction(action.id)}
                  disabled={isLoading}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/80 transition-all text-left flex flex-col justify-between gap-1 group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-sky-400 group-hover:text-sky-300 flex items-center justify-between">
                    {action.label}
                    <ArrowUpRight className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </span>
                  <span className="text-[11px] text-slate-400 leading-snug">
                    {action.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: GitHub Token Configuration */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <Key className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                GitHub Personal Access Token (PAT)
              </h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              GitHub требует Personal Access Token для отправки (push) в публичный репозиторий <strong>gregpost/smartwatch-time-tracker</strong>.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 mb-4">
              <div className="font-semibold text-slate-300">Как создать токен за 1 минуту:</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Откройте GitHub → <strong>Settings</strong> → <strong>Developer settings</strong></li>
                <li>Выберите <strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong></li>
                <li>Нажмите <strong>Generate new token</strong> и отметьте галочку <code>repo</code></li>
                <li>Скопируйте сгенерированный токен (начинается с <code>ghp_</code>)</li>
              </ol>
            </div>

            <form onSubmit={handleSaveToken} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Токен GitHub:
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !tokenInput.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Сохранить и отправить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manual Commit & Version Bump */}
      {showManualCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center gap-2.5 text-sky-400 mb-3">
              <GitCommit className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                Запустить коммит и автопуш
              </h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Версия проекта автоматически повысится в файле конфигурации, к ней добавится постфикс, а правки отправятся в репозиторий.
            </p>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Постфикс версии (характеристика правок):
                </label>
                <input
                  type="text"
                  placeholder="bezel-speed-tuning"
                  value={manualPostfix}
                  onChange={(e) => setManualPostfix(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Будет сформирована версия вида: <span className="font-mono text-sky-400">v0.1.x-{manualPostfix || 'update'}</span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Краткий комментарий на русском:
                </label>
                <textarea
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowManualCommitModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleCommitAndPush(manualReason, manualPostfix)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Коммит и Пуш</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Version & Push History */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-sky-400">
                <History className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  История версий и коммитов
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Закрыть
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {syncState.history?.length > 0 ? (
                syncState.history.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/60 text-[11px]">
                          v{item.version}
                        </span>
                        {item.hash && (
                          <span className="font-mono text-slate-500 text-[10px]">
                            #{item.hash}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="text-slate-500">Статус:</span>
                      <span className={item.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}>
                        {item.status === 'success' ? 'Успешно отправлено' : item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Пока нет сохраненных записей в истории
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
