import { useEffect, useState } from 'react';
import type { GameApi } from '@songie/game-kit/client';
import type { PoolInfo } from '../shared/index.js';

/** Listeleri yükler; ilk açılışta listeler arka planda dolarken yoklar. */
/** `selected`: odada seçili listeler; başkasının eklediği bir liste seçiliyse adı görünsün diye istenir. */
export function usePools(
  api: GameApi,
  enabled = true,
  selected: string[] = [],
): [PoolInfo[] | null, (fn: (p: PoolInfo[] | null) => PoolInfo[] | null) => void] {
  const selectedKey = selected.join(',');
  const [pools, setPools] = useState<PoolInfo[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await api.get<{ pools: PoolInfo[] }>(`/pools${selectedKey ? `?selected=${encodeURIComponent(selectedKey)}` : ''}`);
        if (!alive) return;
        setPools(res.pools);
        if (res.pools.length < 5) timer = setTimeout(load, 3000);
      } catch {
        if (alive) timer = setTimeout(load, 3000);
      }
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [api, enabled, selectedKey]);
  return [pools, setPools];
}
