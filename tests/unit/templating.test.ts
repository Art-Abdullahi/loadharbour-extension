import { describe, expect, it } from 'vitest';
import { buildContext, buildMailto, render, renderEmail } from '../../src/lib/templating';
import { createDefaultSettings } from '../../src/lib/schema';
import type { VisiblePosting } from '../../src/types/shared';

const posting: VisiblePosting = {
  id: 'row-1',
  equipment: 'Van',
  origin: { city: 'Austin', state: 'TX' },
  destination: { city: 'Atlanta', state: 'GA' },
  totalMileage: 980,
  deadheadMileage: 50,
  rate: 2500,
  pickupDate: '2024-05-01',
  deliveryDate: '2024-05-03',
  broker: { name: 'Speedy', phone: '18005550123', email: 'ops@speedy.com', mcNumber: '123456' },
  notes: null,
};

const settings = (() => {
  const base = createDefaultSettings();
  base.company = { name: 'LoadHarbour', mc: 'MC123', phone: '512-555-9000' };
  base.identity = { loginEmail: 'user@example.com', senderEmail: 'dispatch@example.com' };
  return base;
})();

describe('templating', () => {
  it('renders template variables', () => {
    const result = render('Load {{origin_city}} to {{destination_city}}', buildContext(posting, settings));
    expect(result).toBe('Load Austin to Atlanta');
  });

  it('omits missing variables safely', () => {
    const result = render('Missing {{unknown}} tokens', buildContext(posting, settings));
    expect(result).toBe('Missing  tokens');
  });

  it('generates email subject/body from settings', () => {
    const { subject, body } = renderEmail(posting, settings);
    expect(subject).toContain('Austin');
    expect(body).toContain('LoadHarbour');
  });

  it('builds a mailto url with cc and truncation', () => {
    const mailto = buildMailto(posting, settings);
    expect(mailto.startsWith('mailto:ops%40speedy.com')).toBe(true);
    expect(mailto).toContain('subject=');
    expect(mailto).toContain('cc=dispatch%40example.com');
  });
});
