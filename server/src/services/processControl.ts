import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class ProcessControl {
  private static resolveHelper(): { scriptPath: string; cwd: string } {
    const candidates = [
      path.join(__dirname, '../../scripts/backend-control.cjs'),
      path.join(__dirname, '../../../scripts/backend-control.cjs')
    ];
    const scriptPath = candidates.find((p) => fs.existsSync(p));
    if (!scriptPath) {
      throw new Error('Script backend-control.cjs non trovato');
    }
    return { scriptPath, cwd: path.dirname(scriptPath) };
  }

  private static scheduleHelper(mode: 'stop' | 'restart') {
    const { scriptPath, cwd } = this.resolveHelper();
    const child = spawn(process.execPath, [scriptPath, mode], {
      cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env }
    });
    child.unref();
  }

  public static scheduleStop() {
    this.scheduleHelper('stop');
  }

  public static scheduleRestart() {
    this.scheduleHelper('restart');
  }
}
