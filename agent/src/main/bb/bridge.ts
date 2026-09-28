/**
 * BB-Server bridge: spawns bb-server as a child process and exposes workspace
 * state for injection into the system prompt.
 *
 * bb-server binds to a random port and signals it via stderr:
 *   LISTENING 127.0.0.1:<PORT>
 *
 * The bridge reads that line, then provides typed helpers for the REST API.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createLogger } from '@main/utils/log';

const log = createLogger('bb-server');

/** Workspace info shape returned by GET /api/workspace/:chip */
export type WorkspaceInfo = {
  chip: string;
  root: string;
  designs: string[];
  cores: string[];
};

/** Job state shape returned by GET /api/jobs/:id */
export type JobInfo = {
  id: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  chip?: string;
  command?: string;
  createdAt: string;
  finishedAt?: string;
  returncode?: number;
};

/** The bb-server child process handle, valid after startBbServer() resolves. */
let bbProcess: ChildProcess | null = null;
let bbPort: number | null = null;
let startError: string | null = null;

/** Spawn bb-server and wait for it to signal its port via stderr. */
export async function startBbServer(binaryPath: string): Promise<number> {
  if (bbPort !== null) return bbPort;
  if (startError) throw new Error(startError);
  if (bbProcess !== null) {
    // Already started (maybe in error state but process object still there).
    await new Promise<void>((res) => setTimeout(res, 500));
    if (bbPort !== null) return bbPort;
    throw new Error(startError ?? 'bb-server startup in progress');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      // Detach on Windows so the Electron app can exit independently.
      detached: process.platform === 'win32',
    });

    bbProcess = proc;

    const rl = createInterface({ input: proc.stderr!, crlfDelay: Infinity });
    let resolved = false;

    rl.on('line', (line: string) => {
      const match = line.match(/^LISTENING 127\.0\.0\.1:(\d+)$/);
      if (match) {
        bbPort = parseInt(match[1]!, 10);
        log.info(`bb-server started on port ${bbPort}`);
        if (!resolved) {
          resolved = true;
          resolve(bbPort);
        }
      }
    });

    proc.on('error', (err) => {
      startError = `bb-server spawn error: ${err.message}`;
      log.error(startError);
      if (!resolved) {
        resolved = true;
        reject(new Error(startError));
      }
    });

    proc.on('exit', (code, signal) => {
      if (!resolved) {
        startError = `bb-server exited unexpectedly (code=${code} signal=${signal})`;
        resolved = true;
        reject(new Error(startError));
      }
    });

    // Timeout: if no LISTENING line within 10s, give up.
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        startError = 'bb-server startup timed out (no LISTENING signal)';
        log.error(startError);
        reject(new Error(startError));
      }
    }, 10_000);
  });
}

/** Get the bb-server port, or null if not yet started. */
export function getBbServerPort(): number | null {
  return bbPort;
}

/** Build a base URL for the bb-server REST API. */
function apiBase(): string {
  const port = bbPort;
  if (port === null) throw new Error('bb-server not started');
  return `http://127.0.0.1:${port}`;
}

/** GET /api/health */
export async function bbHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/** GET /api/projects?root=<path> */
export async function listProjects(workspaceRoot: string): Promise<string[]> {
  const url = `${apiBase()}/api/projects?root=${encodeURIComponent(workspaceRoot)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`listProjects failed: ${res.status}`);
  const data = (await res.json()) as { chips: string[] };
  return data.chips ?? [];
}

/** GET /api/workspace/:chip?root=<path> */
export async function getWorkspace(workspaceRoot: string, chip: string): Promise<WorkspaceInfo> {
  const url = `${apiBase()}/api/workspace/${encodeURIComponent(chip)}?root=${encodeURIComponent(workspaceRoot)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`getWorkspace failed: ${res.status}`);
  return (await res.json()) as WorkspaceInfo;
}

/** GET /api/jobs */
export async function listJobs(): Promise<JobInfo[]> {
  const res = await fetch(`${apiBase()}/api/jobs`);
  if (!res.ok) throw new Error(`listJobs failed: ${res.status}`);
  return (await res.json()) as JobInfo[];
}

/** GET /api/jobs/:id */
export async function getJob(id: string): Promise<JobInfo> {
  const res = await fetch(`${apiBase()}/api/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getJob failed: ${res.status}`);
  return (await res.json()) as JobInfo;
}

/** Kill the bb-server process. Call on app quit. */
export function stopBbServer(): void {
  if (!bbProcess) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(bbProcess.pid), '/f']);
  } else {
    bbProcess.kill('SIGTERM');
  }
  bbProcess = null;
  bbPort = null;
  startError = null;
}

/**
 * Build a short workspace status note for the system prompt.
 * Includes the current chip (if any) and running jobs.
 */
export async function buildWorkspaceNote(currentChip?: string): Promise<string> {
  try {
    const jobs = await listJobs();
    const running = jobs.filter((j) => j.status === 'running' || j.status === 'queued');

    const chipLine = currentChip ? `Current chip: ${currentChip}` : 'No chip selected';

    if (running.length === 0) {
      return chipLine;
    }

    const jobLines = running
      .map((j) => `  - job ${j.id}: ${j.status}${j.command ? ` (${j.command})` : ''}`)
      .join('\n');
    return `${chipLine}\nRunning jobs:\n${jobLines}`;
  } catch {
    return currentChip ? `Current chip: ${currentChip}` : 'bb-server unavailable';
  }
}
