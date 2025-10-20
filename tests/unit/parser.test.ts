import { describe, expect, it } from 'vitest';
import { parsePosting, closestRow } from '../../src/content/parser';

function buildRow(html: string): Element {
  const container = document.createElement('div');
  container.innerHTML = html;
  const row = container.firstElementChild;
  if (!row) throw new Error('No row built');
  return row;
}

describe('parsePosting', () => {
  it('extracts key fields from a typical row', () => {
    const row = buildRow(`
      <div class="result-row" data-id="abc">
        <div class="route">Dallas, TX → Denver, CO</div>
        <div class="equip">Flatbed</div>
        <div class="miles">802 mi</div>
        <div class="rate">$2,400</div>
        <div class="broker">Fast Logistics</div>
        <a class="phone" href="tel:18005551234">1 (800) 555-1234</a>
        <a class="email" href="mailto:info@fast.com">info@fast.com</a>
      </div>
    `);
    const posting = parsePosting(row);
    expect(posting.origin.city).toBe('Dallas');
    expect(posting.destination.city).toBe('Denver');
    expect(posting.rate).toBe(2400);
    expect(posting.totalMileage).toBe(802);
    expect(posting.broker.email).toBe('info@fast.com');
    expect(posting.broker.phone).toContain('800');
    expect(posting.equipment).toBe('Flatbed');
  });

  it('falls back to origin/destination columns when route not present', () => {
    const row = buildRow(`
      <div class="result-row">
        <div class="origin">Chicago, IL</div>
        <div class="destination">Phoenix, AZ</div>
        <div data-col="miles">1,320</div>
        <div data-col="rate">$4,100</div>
        <div class="company">Reliable Freight</div>
      </div>
    `);
    const posting = parsePosting(row);
    expect(posting.origin.city).toBe('Chicago');
    expect(posting.destination.state).toBe('AZ');
    expect(posting.totalMileage).toBe(1320);
    expect(posting.rate).toBe(4100);
  });
});

describe('closestRow', () => {
  it('returns the nearest row ancestor', () => {
    const wrapper = buildRow(`
      <div class="result-row">
        <div class="content"><span class="child">Value</span></div>
      </div>
    `);
    const child = wrapper.querySelector('.child') as Element;
    expect(closestRow(child)).toBe(wrapper);
  });
});
