import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const normalizedRoot = projectRoot.replaceAll('\\', '/').toLowerCase();

function unixProcesses() {
  const output = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
  return output.split('\n').flatMap((line) => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/);
    return match ? [{ pid: Number(match[1]), parentPid: Number(match[2]), command: match[3] }] : [];
  });
}

function windowsProcesses() {
  const command = 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress';
  const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], { encoding: 'utf8' }).trim();
  if (!output) return [];
  const values = JSON.parse(output);
  return (Array.isArray(values) ? values : [values]).map((entry) => ({
    pid: Number(entry.ProcessId),
    parentPid: Number(entry.ParentProcessId),
    command: String(entry.CommandLine ?? ''),
  }));
}

function projectNextProcess(command) {
  const normalized = command.replaceAll('\\', '/').toLowerCase();
  return normalized.includes(normalizedRoot)
    && normalized.includes('/node_modules/')
    && /(?:\/\.bin\/next(?:\.cmd)?|\/next\/dist\/bin\/next)\s+(?:dev|start)(?:\s|$)/.test(normalized);
}

function descendants(processes, roots) {
  const selected = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of processes) {
      if (!selected.has(entry.pid) && selected.has(entry.parentPid)) {
        selected.add(entry.pid);
        changed = true;
      }
    }
  }
  return selected;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

export async function stopLocalInstances() {
  const processes = process.platform === 'win32' ? windowsProcesses() : unixProcesses();
  const roots = processes.filter((entry) => projectNextProcess(entry.command)).map((entry) => entry.pid);
  const targets = [...descendants(processes, roots)].filter((pid) => pid !== process.pid);

  if (!targets.length) {
    console.log('No prior dxd-chargen Next.js instances found.');
    return;
  }

  if (process.platform === 'win32') {
    for (const pid of roots) execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    for (const pid of targets) {
      try { process.kill(pid, 'SIGTERM'); } catch {}
    }
    for (let attempt = 0; attempt < 20 && targets.some(alive); attempt += 1) await delay(100);
    for (const pid of targets.filter(alive)) {
      try { process.kill(pid, 'SIGKILL'); } catch {}
    }
  }

  console.log(`Stopped dxd-chargen Next.js processes: ${targets.join(', ')}`);
}

await stopLocalInstances();
