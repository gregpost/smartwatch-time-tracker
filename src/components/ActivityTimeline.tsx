import React from 'react';
import { 
  Clock, 
  BarChart3, 
  Download, 
  Sparkles, 
  Calendar, 
  Trash2,
  PieChart
} from 'lucide-react';
import { ACTIVITIES, ActivityLogEntry } from '../types/watch';

interface ActivityTimelineProps {
  logs: ActivityLogEntry[];
  onClearLogs: () => void;
  onSeedSampleData: () => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  logs,
  onClearLogs,
  onSeedSampleData
}) => {
  // Compute analytics
  const totalSlots = logs.length;
  const totalMinutes = totalSlots * 10;
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group by activity
  const countsByActivity: { [key: number]: number } = {};
  logs.forEach(log => {
    countsByActivity[log.activityId] = (countsByActivity[log.activityId] || 0) + 1;
  });

  // Top activity
  let topActivityId = 1;
  let maxCount = 0;
  Object.entries(countsByActivity).forEach(([actId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topActivityId = Number(actId);
    }
  });
  const topActivity = ACTIVITIES.find(a => a.id === topActivityId);

  // Export CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const header = 'ID,Timestamp,Time,ActivityID,ActivityName,IntervalMinutes\n';
    const rows = logs.map(l => `"${l.id}","${l.timestamp}","${l.formattedTime}",${l.activityId},"${l.activityName}",${l.intervalMinutes}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galaxy-watch-activities-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>Учтено времени</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalHours} <span className="text-sm font-normal text-slate-400">ч ({totalMinutes} мин)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalSlots} интервалов по 10 минут
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>Главная активность</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {topActivity ? topActivity.name : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {maxCount > 0 ? `${maxCount * 10} мин (${Math.round((maxCount / (totalSlots || 1)) * 100)}%)` : 'Нет записей'}
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
            <span>Метод фиксации</span>
            <PieChart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">
            Zero-Click Bezel
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            100% авто-выбор без нажатий
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Действия с журналом</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={onSeedSampleData}
              className="flex-1 py-1.5 px-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-medium rounded-lg border border-sky-500/30 flex items-center justify-center gap-1 transition-colors"
            >
              <span>+ Демо-день</span>
            </button>
            {logs.length > 0 && (
              <button
                onClick={onClearLogs}
                title="Очистить историю"
                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Activity Breakdown & Proportion Bar */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span>Распределение времени по 10 направлениям</span>
        </h4>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex mb-4">
          {totalSlots === 0 ? (
            <div className="w-full h-full bg-slate-800" />
          ) : (
            ACTIVITIES.map(act => {
              const count = countsByActivity[act.id] || 0;
              if (count === 0) return null;
              const percent = (count / totalSlots) * 100;
              return (
                <div
                  key={act.id}
                  title={`${act.name}: ${count * 10} мин (${percent.toFixed(0)}%)`}
                  style={{ width: `${percent}%`, backgroundColor: act.color }}
                  className="h-full transition-all duration-300 hover:brightness-125"
                />
              );
            })
          )}
        </div>

        {/* 10 Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {ACTIVITIES.map(act => {
            const count = countsByActivity[act.id] || 0;
            const minutes = count * 10;
            const percent = totalSlots > 0 ? Math.round((count / totalSlots) * 100) : 0;
            return (
              <div
                key={act.id}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: act.color }}
                  />
                  <span className="text-slate-300 font-medium truncate text-[11px]">
                    {act.number}. {act.shortName}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1 text-slate-400 text-[11px]">
                  <span className="font-mono text-white font-bold">{minutes} мин</span>
                  <span className="text-[10px] text-slate-500 font-mono">{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent 10-Minute Intervals Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Хронология 10-минутных интервалов
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Всего записей: {logs.length}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              История пока пуста. Покрутите безель на симуляторе часов выше или нажмите «+ Демо-день» для просмотра аналитики.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-mono">Время</th>
                  <th className="py-2.5 px-4">Деятельность</th>
                  <th className="py-2.5 px-4">Длительность</th>
                  <th className="py-2.5 px-4">Способ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-300">
                      {log.formattedTime}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: log.color }} 
                        />
                        <span className="font-medium text-white">
                          {log.activityName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono">
                      10 минут
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      Безель (Zero-Click)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
