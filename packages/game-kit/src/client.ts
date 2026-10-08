import type { ComponentType } from 'react';
import type { Ack, RoomState } from '@songie/shared';

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

export interface ClientGame {
  id: string;
  name: string;
  /** Rafta oyunun altında görünen tek cümle. */
  pitch: string;
  minPlayers: number;
  maxPlayers: number;
  /** Tek kişilik modu varsa, ana sayfadaki "Tek başına oyna" bu ayarlarla oda kurar. */
  soloSettings?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load(): Promise<ClientGameModule<any, any>>;
}
