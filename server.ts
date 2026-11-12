import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const CONFIG_PATH = path.resolve(__dirname, 'git-sync-config.json');
const PACKAGE_PATH = path.resolve(__dirname, 'package.json');
const TOKEN_PATH = path.resolve(__dirname, '.git-token');

interface GitSyncConfig {
  repoUrl: string;
  branch: string;
  version: string;
  baseVersion: string;
  versionPostfix: string;
  lastCommitMessage: string;
  lastPushTime: string;
  lastPushStatus: 'success' | 'conflict' | 'auth_required' | 'error' | 'pending' | 'idle';
  lastCommitHash: string;
  conflictDetails: string | null;
  suggestedActions: Array<{ id: string; label: string; description: string }>;
  history: Array<{
    version: string;
    timestamp: string;
    message: string;
    hash: string;
    status: string;
  }>;
}

function getDefaultConfig(): GitSyncConfig {
  return {
    repoUrl: 'https://github.com/gregpost/smartwatch-time-tracker',
    branch: 'main',
    version: '0.1.0-github-autopush',
    baseVersion: '0.1.0',
    versionPostfix: 'github-autopush',
    lastCommitMessage: 'Автопуш в репозиторий, инкремент версии и статус на главном экране',
    lastPushTime: new Date().toISOString(),
    lastPushStatus: 'auth_required',
    lastCommitHash: '',
    conflictDetails: 'Для отправки в репозиторий требуется GitHub Personal Access Token (PAT).',
    suggestedActions: [
      {
        id: 'enter_token',
        label: 'Ввести GitHub Personal Access Token (PAT)',
        description: 'Вставьте токен ghp_... для автоматической авторизации при отправке коммитов'
      },
      {
        id: 'pull_rebase',
        label: 'Синхронизировать (git pull --rebase)',
        description: 'Стянуть последние изменения из origin/main'
      },
      {
        id: 'force_push',
        label: 'Принудительный пуш (Force Push)',
        description: 'Перезаписать удаленную ветку текущими изменениями'
      }
    ],
    history: []
  };
}

function readConfig(): GitSyncConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading git-sync-config.json:', err);
  }
  return getDefaultConfig();
}

function writeConfig(cfg: GitSyncConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing git-sync-config.json:', err);
  }
}

function getGitHubToken(): string | null {
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0) {
    return process.env.GITHUB_TOKEN.trim();
  }
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = fs.readFileSync(TOKEN_PATH, 'utf-8').trim();
      if (token.length > 0) return token;
    } catch {
      // ignore
    }
  }
  return null;
}

function saveGitHubToken(token: string) {
  fs.writeFileSync(TOKEN_PATH, token.trim(), 'utf-8');
}

function bumpVersion(currentBase: string, postfix: string): { newBase: string; fullVersion: string } {
  const parts = currentBase.split('.').map(n => parseInt(n, 10));
  const major = isNaN(parts[0]) ? 0 : parts[0];
  const minor = isNaN(parts[1]) ? 1 : parts[1];
  const patch = isNaN(parts[2]) ? 0 : parts[2];

  const newPatch = patch + 1;
  const newBase = `${major}.${minor}.${newPatch}`;
  const cleanPostfix = postfix.trim().replace(/^[-_]+/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  const fullVersion = cleanPostfix ? `${newBase}-${cleanPostfix}` : newBase;

  return { newBase, fullVersion };
}

function syncPackageJson(version: string) {
  try {
    if (fs.existsSync(PACKAGE_PATH)) {
      const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf-8'));
      pkg.version = version;
      fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    }
  } catch (err) {
    console.error('Error syncing package.json version:', err);
  }
}

async function getAuthenticatedRemoteUrl(rawUrl: string, token: string | null): Promise<string> {
  let cleanUrl = rawUrl.trim();
  if (!cleanUrl.endsWith('.git')) {
    cleanUrl += '.git';
  }
  if (!token) {
    return cleanUrl;
  }
  // Strip existing credentials if present
  cleanUrl = cleanUrl.replace(/^https?:\/\/[^@]+@/, 'https://');
  if (cleanUrl.startsWith('https://')) {
    return cleanUrl.replace('https://', `https://${token}@`);
  }
  return cleanUrl;
}

async function executeGitPush(token: string | null, force: boolean = false): Promise<{ success: boolean; output: string; error?: any }> {
  const cfg = readConfig();
  const remoteUrl = await getAuthenticatedRemoteUrl(cfg.repoUrl, token);
  const branch = cfg.branch || 'main';
  const forceFlag = force ? '--force' : '';

  try {
    // Check if git remote origin is configured
    await execPromise('git config --global --add safe.directory /app/applet');
    await execPromise(`git remote set-url origin "${remoteUrl}"`);
    const pushCmd = `git push origin ${branch} ${forceFlag}`.trim();
    const { stdout, stderr } = await execPromise(pushCmd);
    return { success: true, output: stdout + '\n' + stderr };
  } catch (err: any) {
    const errorOutput = (err.stderr || err.stdout || err.message || '').toString();
    return { success: false, output: errorOutput, error: err };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // GET /api/git/status
  app.get('/api/git/status', async (_req: Request, res: Response) => {
    try {
      const cfg = readConfig();
      const token = getGitHubToken();
      let uncommittedCount = 0;
      let lastCommitHash = cfg.lastCommitHash;

      try {
        await execPromise('git config --global --add safe.directory /app/applet');
        const { stdout: statusOut } = await execPromise('git status --porcelain');
        uncommittedCount = statusOut.split('\n').filter(line => line.trim().length > 0).length;

        const { stdout: logOut } = await execPromise('git rev-parse --short HEAD');
        lastCommitHash = logOut.trim();
      } catch {
        // git might be non-initialized or busy
      }

      res.json({
        ...cfg,
        lastCommitHash: lastCommitHash || cfg.lastCommitHash,
        hasTokenConfigured: !!token,
        uncommittedCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/git/save-token
  app.post('/api/git/save-token', (req: Request, res: Response) => {
    const { token } = req.body;
    if (typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }
    saveGitHubToken(token);
    res.json({ success: true, message: 'Токен GitHub успешно сохранен' });
  });

  // POST /api/git/save-settings
  app.post('/api/git/save-settings', (req: Request, res: Response) => {
    const { repoUrl, branch } = req.body;
    const cfg = readConfig();
    if (repoUrl) cfg.repoUrl = repoUrl.trim();
    if (branch) cfg.branch = branch.trim();
    writeConfig(cfg);
    res.json({ success: true, config: cfg });
  });

  // POST /api/git/commit-and-push
  app.post('/api/git/commit-and-push', async (req: Request, res: Response) => {
    try {
      const {
        reason = 'Обновление данных и параметров активности',
        postfix,
        token: reqToken,
        force = false
      } = req.body;

      const cfg = readConfig();
      const token = reqToken || getGitHubToken();

      // Determine new postfix and version
      const activePostfix = postfix || cfg.versionPostfix || 'update';
      const { newBase, fullVersion } = bumpVersion(cfg.baseVersion || '0.1.0', activePostfix);

      cfg.baseVersion = newBase;
      cfg.versionPostfix = activePostfix;
      cfg.version = fullVersion;
      cfg.lastCommitMessage = reason;
      syncPackageJson(fullVersion);
      writeConfig(cfg);

      // Git author config & staging
      await execPromise('git config --global --add safe.directory /app/applet');
      await execPromise('git config user.name "gregpost"');
      await execPromise('git config user.email "gpostolskiy.work4@gmail.com"');

      await execPromise('git add -A');

      // Check if there are staged changes to commit
      let commitHash = cfg.lastCommitHash;
      try {
        const commitMsg = `feat: ${reason} [v${fullVersion}]`;
        await execPromise(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
        const { stdout: hashOut } = await execPromise('git rev-parse --short HEAD');
        commitHash = hashOut.trim();
      } catch (commitErr: any) {
        // Nothing to commit or already committed
        console.log('Git commit note:', commitErr.message);
      }

      cfg.lastCommitHash = commitHash;
      cfg.lastPushTime = new Date().toISOString();

      // Attempt push
      const pushResult = await executeGitPush(token, force);

      if (pushResult.success) {
        cfg.lastPushStatus = 'success';
        cfg.conflictDetails = null;
        cfg.suggestedActions = [];
        cfg.history.unshift({
          version: fullVersion,
          timestamp: cfg.lastPushTime,
          message: reason,
          hash: commitHash,
          status: 'success'
        });
        if (cfg.history.length > 30) cfg.history.pop();
        writeConfig(cfg);

        return res.json({
          success: true,
          status: 'success',
          version: fullVersion,
          timestamp: cfg.lastPushTime,
          message: 'Автопуш успешно совершен!',
          output: pushResult.output,
          config: cfg
        });
      }

      // Handle Failures: Conflict vs Auth
      const out = pushResult.output;
      console.warn('Git push failed output:', out);

      if (
        out.includes('could not read Username') ||
        out.includes('Authentication failed') ||
        out.includes('Permission to') ||
        out.includes('403') ||
        out.includes('401') ||
        !token
      ) {
        cfg.lastPushStatus = 'auth_required';
        cfg.conflictDetails = 'Требуется токен GitHub Personal Access Token (PAT) для доступа на запись в https://github.com/gregpost/smartwatch-time-tracker. Токен можно создать в настройках GitHub с областью repo / contents.';
        cfg.suggestedActions = [
          {
            id: 'enter_token',
            label: 'Ввести GitHub Personal Access Token (PAT)',
            description: 'Вставьте ваш токен (ghp_...) для авторизованной отправки в репозиторий'
          },
          {
            id: 'pull_rebase',
            label: 'Синхронизировать (Pull / Rebase)',
            description: 'Стянуть последние изменения из удаленной ветки'
          }
        ];
      } else if (
        out.includes('Updates were rejected') ||
        out.includes('fetch first') ||
        out.includes('non-fast-forward') ||
        out.includes('conflict')
      ) {
        cfg.lastPushStatus = 'conflict';
        cfg.conflictDetails = 'Обнаружен конфликт пуша: в удаленной ветке origin/' + (cfg.branch || 'main') + ' есть новые коммиты, которых нет в локальной ветке.';
        cfg.suggestedActions = [
          {
            id: 'pull_rebase',
            label: 'Выполнить git pull --rebase',
            description: 'Автоматически стянуть удаленные изменения и накатить ваши коммиты сверху'
          },
          {
            id: 'force_push',
            label: 'Принудительный пуш (Force Push)',
            description: 'Перезаписать удаленную ветку текущим состоянием проекта (--force)'
          },
          {
            id: 'retry',
            label: 'Повторить отправку',
            description: 'Попробовать снова отправить изменения'
          }
        ];
      } else {
        cfg.lastPushStatus = 'error';
        cfg.conflictDetails = `Ошибка при отправке: ${out.slice(0, 300)}`;
        cfg.suggestedActions = [
          {
            id: 'retry',
            label: 'Повторить попытку',
            description: 'Повторить выполнение push'
          },
          {
            id: 'pull_rebase',
            label: 'Синхронизировать с origin/main',
            description: 'Стянуть обновления перед отправкой'
          }
        ];
      }

      cfg.history.unshift({
        version: fullVersion,
        timestamp: cfg.lastPushTime,
        message: reason,
        hash: commitHash,
        status: cfg.lastPushStatus
      });
      if (cfg.history.length > 30) cfg.history.pop();
      writeConfig(cfg);

      return res.status(200).json({
        success: false,
        status: cfg.lastPushStatus,
        version: fullVersion,
        timestamp: cfg.lastPushTime,
        conflictDetails: cfg.conflictDetails,
        suggestedActions: cfg.suggestedActions,
        config: cfg
      });
    } catch (err: any) {
      console.error('Git commit-and-push handler error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/git/resolve-conflict
  app.post('/api/git/resolve-conflict', async (req: Request, res: Response) => {
    try {
      const { action, token: reqToken } = req.body;
      const cfg = readConfig();
      const token = reqToken || getGitHubToken();
      const branch = cfg.branch || 'main';

      await execPromise('git config --global --add safe.directory /app/applet');
      const remoteUrl = await getAuthenticatedRemoteUrl(cfg.repoUrl, token);
      await execPromise(`git remote set-url origin "${remoteUrl}"`);

      if (action === 'pull_rebase') {
        try {
          const { stdout, stderr } = await execPromise(`git pull --rebase origin ${branch}`);
          // After rebase, attempt push
          const pushRes = await executeGitPush(token, false);
          if (pushRes.success) {
            cfg.lastPushStatus = 'success';
            cfg.conflictDetails = null;
            cfg.suggestedActions = [];
            cfg.lastPushTime = new Date().toISOString();
            writeConfig(cfg);
            return res.json({ success: true, message: 'Rebase и Push успешно выполнены!', config: cfg });
          } else {
            return res.json({ success: false, message: 'Pull выполнен, но push не удался: ' + pushRes.output, config: cfg });
          }
        } catch (rebaseErr: any) {
          return res.status(400).json({
            success: false,
            message: 'Ошибка при rebase: ' + (rebaseErr.stderr || rebaseErr.message)
          });
        }
      } else if (action === 'force_push') {
        const pushRes = await executeGitPush(token, true);
        if (pushRes.success) {
          cfg.lastPushStatus = 'success';
          cfg.conflictDetails = null;
          cfg.suggestedActions = [];
          cfg.lastPushTime = new Date().toISOString();
          writeConfig(cfg);
          return res.json({ success: true, message: 'Принудительный пуш (Force Push) выполнен успешно!', config: cfg });
        } else {
          return res.status(400).json({ success: false, message: 'Ошибка при force push: ' + pushRes.output });
        }
      } else if (action === 'retry') {
        const pushRes = await executeGitPush(token, false);
        if (pushRes.success) {
          cfg.lastPushStatus = 'success';
          cfg.conflictDetails = null;
          cfg.suggestedActions = [];
          cfg.lastPushTime = new Date().toISOString();
          writeConfig(cfg);
          return res.json({ success: true, message: 'Пуш успешно выполнен!', config: cfg });
        } else {
          return res.status(400).json({ success: false, message: 'Повторный пуш не удался: ' + pushRes.output });
        }
      }

      res.status(400).json({ error: 'Неизвестное действие: ' + action });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = http.createServer(app);

  // Serve static in production or attach Vite in dev
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
