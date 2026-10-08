/**
 * Platform ses oynatıcısı (tüm oyunlar ortak kullanır).
 *
 * - Web Audio + AudioBuffer: 0,1 sn'lik kliplerde bile örnek hassasiyetinde başlar.
 * - Tarayıcılar sesi yalnızca bir kullanıcı etkileşimiyle açar. Bu modül uygulama açılışında
 *   yüklenir ve "click/touchend/keydown" olaylarını dinler; böylece "Oda kur", "Hazırım" gibi
 *   herhangi bir dokunuş sesi oyun başlamadan açar ve ilk klip kendiliğinden çalar.
 * - iOS: `navigator.audioSession.type = 'playback'` sessiz mod anahtarına rağmen sesi çalar;
 *   "interrupted" duruma düşen bağlam kapatılıp yeniden kurulur.
 */
type Listener = () => void;

const VOLUME_KEY = 'songie.volume';

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.8;
  } catch {
    return 0.8;
  }
}

class AudioPlayer {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private source: AudioBufferSourceNode | null = null;
  private listeners = new Set<Listener>();
  private keySeq = 0;
  volume = readVolume();
  playing: { url: string; startedAt: number; duration: number; key: number } | null = null;
  /** Son çalma denemesi başarısız olduysa nedeni (kullanıcıya "Sesi aç" göstermek için). */
  blocked = false;

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const state = this.ctx?.state as string | undefined;
    if (state === 'closed' || state === 'interrupted') {
      void this.ctx!.close().catch(() => {});
      this.ctx = null;
      this.buffers.clear();
    }
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
      this.ctx.onstatechange = () => this.emit();
    }
    return this.ctx;
  }

  get unlocked(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Kullanıcı etkileşimi içinde çağrılır. */
  async unlock(): Promise<boolean> {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        // desteklenmiyor
      }
    }
    const ctx = this.context();
    if (!ctx) return false;
    // Sessiz bir tampon çalmak iOS'ta bağlamı gerçekten açar.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start();
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    this.blocked = ctx.state !== 'running';
    this.emit();
    return !this.blocked;
  }

  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      // saklanamazsa bu oturumla sınırlı
    }
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    this.emit();
  }

  load(url: string): Promise<AudioBuffer> {
    let p = this.buffers.get(url);
    if (!p) {
      const ctx = this.context();
      if (!ctx) return Promise.reject(new Error('Web Audio yok'));
      p = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`clip ${res.status}`);
          return res.arrayBuffer();
        })
        .then((data) => ctx.decodeAudioData(data));
      p.catch(() => this.buffers.delete(url));
      this.buffers.set(url, p);
      if (this.buffers.size > 24) this.buffers.delete(this.buffers.keys().next().value!);
    }
    return p;
  }

  /** Klibi çalar. Ses henüz açılmadıysa `false` döner ve `blocked` işaretlenir. */
  async play(url: string): Promise<boolean> {
    const ctx = this.context();
    if (!ctx) return false;
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    if (ctx.state !== 'running') {
      this.blocked = true;
      this.emit();
      return false;
    }
    this.blocked = false;
    let buffer: AudioBuffer;
    try {
      buffer = await this.load(url);
    } catch (err) {
      console.warn('[audio] klip yüklenemedi', url, err);
      return false;
    }
    this.stop(false);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain!);
    src.onended = () => {
      if (this.source === src) {
        this.source = null;
        this.playing = null;
        this.emit();
      }
    };
    src.start();
    this.source = src;
    this.playing = { url, startedAt: performance.now(), duration: buffer.duration, key: ++this.keySeq };
    this.emit();
    return true;
  }

  stop(notify = true): void {
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        // zaten bitmiş
      }
      this.source = null;
    }
    this.playing = null;
    if (notify) this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const player = new AudioPlayer();

/** Uygulama açılışında bir kez çağrılır: ilk geçerli etkileşimde sesi açar. */
export function installAudioUnlock(): void {
  if (typeof document === 'undefined') return;
  const events = ['click', 'touchend', 'keydown'] as const;
  const handler = () => {
    void player.unlock().then((ok) => {
      if (ok) for (const e of events) document.removeEventListener(e, handler, true);
    });
  };
  for (const e of events) document.addEventListener(e, handler, true);
}
