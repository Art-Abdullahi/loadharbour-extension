import { describe, expect, it } from 'vitest';
import { isAllowed } from '../../src/lib/host';

describe('isAllowed', () => {
  it('matches exact hostnames', () => {
    expect(isAllowed('https://power.dat.com/search', ['power.dat.com'])).toBe(true);
  });

  it('rejects non-allowlisted hosts', () => {
    expect(isAllowed('https://example.com', ['power.dat.com'])).toBe(false);
  });

  it('supports wildcard subdomains', () => {
    expect(isAllowed('https://sub.power.dat.com', ['*.dat.com'])).toBe(true);
  });
});
