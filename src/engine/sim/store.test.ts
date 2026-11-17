import { describe, expect, it } from 'vitest';
import { useSimStore } from './store';

describe('picking a part', () => {
  it('counts every pick, picking the part already picked included', () => {
    const { selectPart } = useSimStore.getState();
    const before = useSimStore.getState().picks;
    selectPart('gearbox');
    selectPart('gearbox');
    expect(useSimStore.getState().picks).toBe(before + 2);
    expect(useSimStore.getState().view.selectedPart).toBe('gearbox');
  });
});
