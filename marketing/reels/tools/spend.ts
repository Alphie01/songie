import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SPEND_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.spend.json');

export class BudgetError extends Error {
  constructor(spent: number, estimate: number, cap: number) {
    super(`Budget exceeded: spent $${spent.toFixed(2)} + estimate $${estimate.toFixed(2)} > cap $${cap.toFixed(2)}. Ask the user before continuing.`);
    this.name = 'BudgetError';
  }
}

export type SpendEntry = {
  id: string;
  kind: 'image' | 'video';
  provider: 'kie' | 'openai';
  usd: number;
  taskId?: string;
  state: 'pending' | 'done' | 'failed';
};

export class SpendLedger {
  constructor(
    private file: string,
    private cap = 10,
  ) {}

  private read(): SpendEntry[] {
    return fs.existsSync(this.file) ? (JSON.parse(fs.readFileSync(this.file, 'utf8')) as { entries: SpendEntry[] }).entries : [];
  }

  /** Only `done` entries count as spent. */
  spent(): number {
    return this.read().reduce((s, e) => (e.state === 'done' ? s + e.usd : s), 0);
  }

  assertCanSpend(estimateUsd: number): void {
    const spent = this.spent();
    if (spent + estimateUsd > this.cap + 1e-9) throw new BudgetError(spent, estimateUsd, this.cap);
  }

  /** Upserts by id. */
  record(e: SpendEntry): void {
    const entries = this.read().filter((x) => x.id !== e.id);
    entries.push(e);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const spent = entries.reduce((t, x) => (x.state === 'done' ? t + x.usd : t), 0);
    fs.writeFileSync(this.file, JSON.stringify({ cap: this.cap, spent, entries }, null, 2) + '\n');
  }

  find(id: string): SpendEntry | undefined {
    return this.read().find((e) => e.id === id);
  }
}
