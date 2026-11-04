import { PROGRESS_VERSION, readStoredProgress, type ProgressData } from './store';

// Progress as a backup file: written out to keep or move to another browser, and read back in.
// The file holds the same versioned shape the browser stores, marked as this app's.

const KIND = 'how-things-work progress';

export interface BackupFile {
  readonly name: string;
  readonly text: string;
}

/** The backup file for this progress, named with the day it was made. */
export function progressBackup(data: ProgressData, at: Date = new Date()): BackupFile {
  const day = at.toISOString().slice(0, 10);
  const text = JSON.stringify(
    { kind: KIND, version: PROGRESS_VERSION, exportedAt: at.toISOString(), state: data },
    null,
    2,
  );
  return { name: `how-things-work-progress-${day}.json`, text };
}

export type BackupReading =
  | { readonly ok: true; readonly data: ProgressData; readonly exportedAt: string | null }
  | { readonly ok: false; readonly problem: string };

/** Reads a backup file's text, or says plainly why it cannot. */
export function readProgressBackup(text: string): BackupReading {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'That file is not a progress backup: it is not JSON.' };
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('kind' in parsed) ||
    parsed.kind !== KIND
  ) {
    return { ok: false, problem: 'That file is not a progress backup from How Things Work.' };
  }
  const { version, state } = parsed as { version?: unknown; state?: unknown };
  const data = readStoredProgress({ version, state });
  if (data === null) {
    return {
      ok: false,
      problem: 'That backup could not be read. It may be damaged, or from a newer version.',
    };
  }
  const exportedAt =
    'exportedAt' in parsed && typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null;
  return { ok: true, data, exportedAt };
}
