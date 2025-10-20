import { describe, expect, it } from 'vitest';
import { computeRpm, formatPostingText } from '../../src/lib/math';
import type { VisiblePosting } from '../../src/types/shared';

const basePosting: VisiblePosting = {
  id: 'p1',
  equipment: 'Van',
  origin: { city: 'Austin', state: 'TX' },
  destination: { city: 'Denver', state: 'CO' },
  totalMileage: 900,
  deadheadMileage: null,
  rate: 2700,
  pickupDate: null,
  deliveryDate: null,
  broker: { name: 'Broker', phone: '555', email: 'broker@example.com', mcNumber: null },
  notes: null,
};

describe('computeRpm', () => {
  it('computes RPM with deadhead miles', () => {
    expect(computeRpm(basePosting, 100)).toBeCloseTo(2.7, 2);
  });

  it('returns null when miles are zero', () => {
    const posting = { ...basePosting, totalMileage: 0 };
    expect(computeRpm(posting, 0)).toBeNull();
  });

  it('returns null when rate missing', () => {
    const posting = { ...basePosting, rate: null };
    expect(computeRpm(posting, 0)).toBeNull();
  });
});

describe('formatPostingText', () => {
  it('builds a copy-friendly string', () => {
    const text = formatPostingText(basePosting);
    expect(text).toContain('Austin');
    expect(text).toContain('Broker');
    expect(text.split('\n').length).toBeGreaterThan(2);
  });
});
