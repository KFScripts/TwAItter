const { execSync, spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || '5000';
const SERVER_DIR = path.resolve(__dirname, '..');
const mode = (process.argv[2] || 'restart').toLowerCase();

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function pidsListeningOnPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}" | findstr LISTENING`, {
      encoding: 'utf8',
      windowsHide: true
    });
    return [
      ...new Set(
        out
          .split(/\r?\n/)
          .map((line) => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          })
          .filter((pid) => pid && /^\d+$/.test(pid))
      )
    ];
  } catch {
    return [];
  }
}

function getProcess(pid) {
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\" | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress"`,
      { encoding: 'utf8', windowsHide: true }
    );
    const parsed = JSON.parse(out.trim() || 'null');
    return parsed || null;
  } catch {
    return null;
  }
}

function isServerStackProcess(info) {
  if (!info) return false;
  const blob = `${info.Name || ''} ${info.CommandLine || ''}`;
  return /nodemon|npm-cli|npm\.cmd|npx-cli|ts-node|TwAItter[\\/]server|twaitter-server/i.test(blob);
}

function isOsRoot(info) {
  if (!info) return true;
  return /explorer|services|svchost|wininit|winlogon|System|Idle/i.test(info.Name || '');
}

function resolveKillTarget(listenPid) {
  let current = Number(listenPid);
  let target = current;
  for (let i = 0; i < 10; i++) {
    const info = getProcess(current);
    if (!info) break;
    if (isServerStackProcess(info)) target = current;
    const parentId = Number(info.ParentProcessId || 0);
    if (!parentId) break;
    const parent = getProcess(parentId);
    if (isOsRoot(parent)) break;
    if (isServerStackProcess(parent) || /cmd\.exe|powershell/i.test(parent?.Name || '')) {
      current = parentId;
      continue;
    }
    break;
  }
  return target;
}

function killPidTree(pid) {
  try {
    execSync(`taskkill /F /T /PID ${pid}`, { windowsHide: true, stdio: 'ignore' });
  } catch {
    // already gone
  }
}

function stopBackend() {
  const listenPids = pidsListeningOnPort(PORT);
  const targets = new Set();
  for (const pid of listenPids) {
    targets.add(String(resolveKillTarget(pid)));
  }
  for (const pid of targets) {
    killPidTree(pid);
  }
}

function startBackend() {
  spawn(
    'cmd.exe',
    ['/c', 'start', 'TwAItter Backend', 'cmd', '/k', `cd /d "${SERVER_DIR}" && npm run dev`],
    {
      cwd: SERVER_DIR,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    }
  ).unref();
}

sleep(900);
stopBackend();

if (mode === 'restart') {
  sleep(700);
  startBackend();
}
