import type { ComponentType } from 'react';
import type { Ack, RoomPlayer, RoomState } from '@songie/shared';
import type { IconName } from './ui/Icon';

/** Oyunun kendi HTTP uçlarına (`/api/games/<id>`) yetkili istek. */
export interface GameApi {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export interface SettingsPanelProps<S> {
  settings: S;
  editable: boolean;
  onChange(next: S): void;
  api: GameApi;
  /**
   * Geniş ekranda lobi ayarları iki yan sütuna bölünür. `primary` sol (ne oynanacak),
   * `secondary` sağ (nasıl oynanacak). Verilmezse hepsi tek sütunda.
   */
  section?: 'primary' | 'secondary';
  /** Odadaki oyuncular (ör. takım ataması için). */
  players: readonly RoomPlayer[];
  meId: string;
}

export interface PlayViewProps<V, S = unknown> {
  view: V;
  meId: string;
  room: RoomState;
  act(action: unknown): Promise<Ack<Record<string, unknown>>>;
  api: GameApi;
  /** Odanın güncel ayarları; oyun sırasında da değişebilir. */
  settings: S;
  /** Yalnızca oda sahibi için; oyun destekliyorsa ayarlar sıradaki turdan itibaren uygulanır. */
  setSettings(next: S): Promise<void>;
}

export interface ClientGameModule<S = unknown, V = unknown> {
  SettingsPanel: ComponentType<SettingsPanelProps<S>>;
  PlayView: ComponentType<PlayViewProps<V, S>>;
}

/** Tanıtım penceresindeki bir sayfa. */
export interface GuideSection {
  /** Kısa başlık: "Amaç", "Sıra sende", "Kartlar", "Roller", "Puanlama"… */
  title: string;
  /** 1–3 kısa paragraf; paragraflar boş satırla (\n\n) ayrılır. */
  body?: string;
  /** Kart/rol/terim sözlüğü: her biri adı ve ne işe yaradığı. */
  items?: {
    term: string;
    text: string;
    /** Rozet rengi (tokens.css): yeşil, sarı, turuncu, kırmızı, mor ya da nötr. */
    tone?: 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'neutral';
  }[];
  /** Tek cümlelik ipucu ("Bilmiyorsan pas geç; yanlış tahmin sırayı geçirir."). */
  tip?: string;
}

/** Oyunun tanıtımı: ilk girişte ve "Nasıl oynanır?" ile açılan adım adım pencere. */
export interface GameGuide {
  /** Oyunun ne olduğu, 1–2 cümle. */
  summary: string;
  /** "4–16 oyuncu, iki takım" gibi. */
  players: string;
  /** "15–30 dk" gibi. */
  duration: string;
  /** 3–7 sayfa: amaç, akış, kartlar/roller, puanlama, ipuçları. */
  sections: GuideSection[];
}

export interface ClientGame {
  id: string;
  name: string;
  /** Rafta oyunun altında görünen tek cümle. */
  pitch: string;
  icon: IconName;
  /** Tanıtım penceresi içeriği (ilk girişte otomatik açılır). */
  guide?: GameGuide;
  minPlayers: number;
  maxPlayers: number;
  /** Tek kişilik modu varsa, ana sayfadaki "Tek başına oyna" bu ayarlarla oda kurar. */
  soloSettings?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load(): Promise<ClientGameModule<any, any>>;
}
