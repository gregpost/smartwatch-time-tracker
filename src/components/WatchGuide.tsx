import React from 'react';
import { 
  Smartphone, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  RotateCw, 
  Zap, 
  BatteryCharging 
} from 'lucide-react';

export const WatchGuide: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto text-xs text-slate-300">
      {/* Intro Banner */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <RotateCw className="w-4 h-4 text-sky-400" />
          <span>Как работает безель в этом проекте для Samsung Galaxy Watch</span>
        </h3>
        <p className="text-slate-300 leading-relaxed text-xs">
          Samsung Galaxy Watch обладает уникальной аппаратной фишкой: <strong>физическим поворотным безелем</strong> (в моделях Classic: Watch 4 Classic, Watch 6 Classic) и <strong>сенсорным виртуальным безелем по кромке стекла</strong> (Watch 4, Watch 5, Watch 6, Watch 7, Watch Ultra). В Wear OS оба варианта передают системные события <code className="text-sky-300">MotionEvent.ACTION_SCROLL</code> с осью <code className="text-sky-300">AXIS_SCROLL</code>.
        </p>
      </div>

      {/* AUTOMATED BUILD SCRIPT BANNER FOR WSL */}
      <div className="p-5 bg-gradient-to-r from-sky-950/80 via-slate-900 to-slate-900 border border-sky-600/40 rounded-xl space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sky-400" />
            <h4 className="text-sm font-bold text-white">
              Автоматическая сборка APK через WSL Linux (Рекомендуется)
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] border border-sky-500/30">
            Скрипт в корне: build-apk-wsl.sh
          </span>
        </div>

        <p className="text-slate-300 leading-relaxed text-xs">
          В корень проекта добавлен скрипт <code className="text-sky-300 font-mono">build-apk-wsl.sh</code>, который выполняет сборку APK с <strong>максимальной надёжностью с первого раза</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Проверка Android Studio:</strong> скрипт ищет Android SDK в WSL и в Windows (<code className="text-slate-400">/mnt/c/Users/.../Android/Sdk</code>).</span>
          </div>
          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Авто-скачивание SDK:</strong> если Android Studio не установлена, скрипт сам скачивает официальные Google Command-Line Tools.</span>
          </div>
          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Установка Java:</strong> если JDK 17 отсутствует, устанавливает OpenJDK 17 через пакетный менеджер.</span>
          </div>
          <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Готовый APK:</strong> собирает проект и сохраняет файл <code className="text-sky-300">GalaxyWatch-BezelTracker.apk</code> в корень проекта.</span>
          </div>
        </div>

        <div className="pt-1 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400">Команды для запуска в терминале WSL:</div>
          
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-300">
            <span className="text-slate-500"># 1. Авто-поиск (скрипт сам сканирует диск D:\programs\android-studio и AppData):</span><br/>
            <code>chmod +x build-apk-wsl.sh && ./build-apk-wsl.sh</code>
          </div>

          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300">
            <span className="text-slate-500"># 2. Или с прямым указанием пути (поддерживается синтаксис Windows и WSL):</span><br/>
            <code>./build-apk-wsl.sh "D:\programs\android-studio"</code><br/>
            <span className="text-slate-400"># или: ./build-apk-wsl.sh /mnt/d/programs/android-studio</span>
          </div>

          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-amber-400">💡 Почему добавление в PATH не помогло?</div>
            <p className="text-slate-400 leading-relaxed">
              Переменная <code>PATH</code> нужна только для вызова команд в консоли (например, <code>studio64.exe</code>). Система сборки <strong>Gradle</strong> и плагин Android ищут SDK не в <code>PATH</code>, а в переменной <code>ANDROID_HOME</code> или в файле <code>local.properties</code> по ключу <code>sdk.dir</code>. В WSL диск <code>D:\</code> доступен по пути <code>/mnt/d/</code>. Обновлённый скрипт теперь автоматически конвертирует Windows-путь и находит SDK на диске D:.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Steps Deployment Guide */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Ручная сборка и запуск через Android Studio
        </h4>

        {/* Step 1 */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex gap-3.5">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 border border-sky-500/30">
            1
          </div>
          <div className="space-y-1.5 flex-1">
            <h5 className="font-semibold text-white">Включение Режима разработчика на часах</h5>
            <p className="text-slate-400">
              На часах откройте: <strong>Настройки (Settings)</strong> → <strong>О часах (About watch)</strong> → <strong>Сведения о ПО (Software info)</strong>. Быстро нажмите <strong>7 раз подряд</strong> на пункт <strong>Версия ПО (Software version)</strong>, пока не появится уведомление: <em>«Режим разработчика включен»</em>.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex gap-3.5">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 border border-sky-500/30">
            2
          </div>
          <div className="space-y-1.5 flex-1">
            <h5 className="font-semibold text-white">Включение Беспроводной отладки (Wireless Debugging)</h5>
            <p className="text-slate-400">
              Вернитесь в главное меню настроек часов → внизу откройте новый раздел <strong>Параметры разработчика (Developer options)</strong>:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
              <li>Включите <strong>Отладка по ADB (ADB debugging)</strong>.</li>
              <li>Включите <strong>Беспроводная отладка (Wireless debugging)</strong>.</li>
              <li>Убедитесь, что часы и компьютер подключены к одной Wi-Fi сети.</li>
            </ul>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex gap-3.5">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 border border-sky-500/30">
            3
          </div>
          <div className="space-y-1.5 flex-1">
            <h5 className="font-semibold text-white">Сопряжение и подключение в Android Studio</h5>
            <p className="text-slate-400">
              На часах нажмите <strong>Подключить новое устройство (Pair new device)</strong>. Часы покажут IP, порт сопряжения и 6-значный Pairing Code. В терминале Android Studio введите:
            </p>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-300">
              adb pair 192.168.1.120:39841<br/>
              <span className="text-slate-500"># Введите 6-значный код сопряжения с часов</span><br/>
              adb connect 192.168.1.120:41235
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex gap-3.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">
            4
          </div>
          <div className="space-y-1.5 flex-1">
            <h5 className="font-semibold text-white">Сборка и запуск приложения</h5>
            <p className="text-slate-400">
              Нажмите зеленую кнопку <strong>Run (Shift + F10)</strong> в Android Studio. Приложение соберется и установится прямо на часы. При первом запуске часы запросят стандартные разрешения.
            </p>
          </div>
        </div>
      </div>

      {/* Battery & Background Optimization Note */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl flex gap-3">
        <BatteryCharging className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="font-semibold text-amber-300">Рекомендация по батарее Samsung Galaxy Watch</h5>
          <p className="text-slate-300 leading-relaxed">
            Чтобы система часов не усыпляла 10-минутный AlarmManager при выключенном экране:
            на часах перейдите в <strong>Настройки</strong> → <strong>Приложения</strong> → выберите <strong>Bezel Activity Tracker</strong> → <strong>Батарея</strong> → поставьте <strong>«Без ограничений» (Unrestricted)</strong>. В коде проекта уже реализован метод <code className="text-amber-200">setExactAndAllowWhileIdle</code>, гарантирующий срабатывание даже в глубоком сне.
          </p>
        </div>
      </div>

      {/* Zero-Click Architecture details */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <h4 className="font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-sky-400" />
          <span>Архитектура авто-выбора (Zero-Click)</span>
        </h4>
        <p className="text-slate-400 leading-relaxed">
          В <code className="text-sky-300">MainActivity.java</code> реализован таймер задержки:
        </p>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
          autoConfirmHandler.removeCallbacks(autoConfirmRunnable);<br/>
          autoConfirmHandler.postDelayed(autoConfirmRunnable, 1500); // 1.5 сек
        </div>
        <p className="text-slate-400 leading-relaxed">
          Когда вы крутите безель, таймер постоянно сбрасывается. Как только вы остановились на нужном пункте (например, «7. Спорт»), через 1.5 секунды срабатывает <code className="text-sky-300">autoConfirmRunnable</code>: он производит вибро-клик подтверждения, записывает строчку в базу Room и вызывает <code className="text-sky-300">finish()</code>, возвращая часы в режим ожидания.
        </p>
      </div>
    </div>
  );
};
