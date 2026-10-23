import { describe, expect, it } from 'vitest';
import {
  answerOf,
  askedTo,
  confirmPick,
  envelopeFrom,
  pickHint,
  pickable,
  pillLabel,
  revealHead,
  segment,
  suffix,
  timerFill,
  timerLow,
  voteLabel,
} from '../src/brand/itiraf/paranoiaText';

describe('Gizlilik Esas copy (games/paranoia/client/strings.ts)', () => {
  it('labels', () => {
    expect(pillLabel(4, 10)).toBe('Gizlilik Esas · 4/10 soru');
    expect(envelopeFrom('Deniz')).toBe('Deniz sana gönderdi. Kimse görmesin, sonra zarfa dokun.');
    expect(confirmPick('Kaan')).toBe('Kaan seçimini onayla');
    expect(revealHead(3, 10)).toBe('Soru 3/10');
    expect(voteLabel(2, 4)).toBe('Sıradakine geç (2/4)');
  });
  it('Turkish case endings', () => {
    expect(askedTo('Kaan')).toBe("Kaan'a soruldu");
    expect(askedTo('Ece')).toBe("Ece'ye soruldu");
    expect(answerOf('Kaan')).toBe("Kaan'ın cevabı");
    expect(answerOf('Bora')).toBe("Bora'nın cevabı");
    expect(answerOf('Mert')).toBe("Mert'in cevabı");
    expect(suffix('X1', 'dat')).toBeNull();
    expect(askedTo('Xyz')).toBe('Soruldu: Xyz');
  });
  it('picker and hint', () => {
    const all = ['Ece', 'Mert', 'Deniz', 'Kaan'];
    expect(pickable(all, 'Ece', 'Deniz', false, true)).toEqual(['Mert', 'Kaan']);
    expect(pickable(all, 'Ece', 'Deniz', true, false)).toEqual(all);
    expect(pickHint(false, true)).toBe('Kendini ve soruyu sana gönderen kişiyi seçemezsin. Seçtiğin kişi sıradaki soruyu alır.');
    expect(pickHint(true, false)).toBe('Seçtiğin kişi sıradaki soruyu alır.');
  });
  it('progress and timer', () => {
    expect([0, 2, 3, 4].map((i) => segment(i, 3))).toEqual(['done', 'done', 'now', 'empty']);
    expect(timerFill(20, 40)).toBe(50);
    expect(timerLow(7)).toBe(true);
    expect(timerLow(8)).toBe(false);
  });
});
