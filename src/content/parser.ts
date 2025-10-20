import type { VisiblePosting } from '../types/shared';

const SELECTORS = {
  equipment: ['.equip', '[data-col="equipment"]', '[data-testid="equipment"]'],
  route: ['.route', '[data-col="route"]', '[data-testid="route"]'],
  origin: ['.origin', '[data-col="origin"]'],
  destination: ['.destination', '[data-col="destination"]'],
  miles: ['.miles', '[data-col="miles"]', '[data-testid="miles"]'],
  rate: ['.rate', '[data-col="rate"]', '[data-testid="rate"]'],
  pickup: ['.pickup', '[data-col="pickup"]'],
  delivery: ['.delivery', '[data-col="delivery"]'],
  broker: ['.broker', '.company', '[data-col="broker"]'],
  phone: ['.phone', '[data-col="phone"]', 'a[href^="tel:"]'],
  email: ['.email', '[data-col="email"]', 'a[href^="mailto:"]'],
  mc: ['.mc', '[data-col="mc"]'],
};

function sanitize(element: Element | null | undefined): string | null {
  if (!element) return null;
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function findText(root: Element, selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    const value = sanitize(el ?? undefined);
    if (value) return value;
  }
  return null;
}

function parseRoute(routeText: string | null): { originCity: string; originState: string; destCity: string; destState: string } {
  if (!routeText) {
    return { originCity: '', originState: '', destCity: '', destState: '' };
  }
  const arrowSplit = routeText.split(/→|->| to /i);
  if (arrowSplit.length >= 2) {
    const [originRaw, destRaw] = arrowSplit;
    const [originCity, originState = ''] = originRaw.split(',').map((part) => part.trim());
    const [destCity, destState = ''] = destRaw.split(',').map((part) => part.trim());
    return { originCity, originState, destCity, destState };
  }
  return { originCity: routeText, originState: '', destCity: '', destState: '' };
}

function parseNumber(input: string | null): number | null {
  if (!input) return null;
  const match = input.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number.parseFloat(match[1]);
}

export function parsePosting(row: Element): VisiblePosting {
  const equipment = findText(row, SELECTORS.equipment);
  const routeText = findText(row, SELECTORS.route);
  const originText = findText(row, SELECTORS.origin);
  const destinationText = findText(row, SELECTORS.destination);
  const milesText = findText(row, SELECTORS.miles);
  const rateText = findText(row, SELECTORS.rate);
  const pickupText = findText(row, SELECTORS.pickup);
  const deliveryText = findText(row, SELECTORS.delivery);
  const brokerText = findText(row, SELECTORS.broker) ?? 'Unknown broker';
  const phoneText = findText(row, SELECTORS.phone);
  const emailText = findText(row, SELECTORS.email);
  const mcText = findText(row, SELECTORS.mc);

  const idAttr = row.getAttribute('data-id') ?? row.id ?? undefined;

  let originCity = '';
  let originState = '';
  let destCity = '';
  let destState = '';

  if (routeText) {
    const parsed = parseRoute(routeText);
    originCity = parsed.originCity;
    originState = parsed.originState;
    destCity = parsed.destCity;
    destState = parsed.destState;
  }

  if (!originCity && originText) {
    const [city, state = ''] = originText.split(',').map((part) => part.trim());
    originCity = city;
    originState = state;
  }

  if (!destCity && destinationText) {
    const [city, state = ''] = destinationText.split(',').map((part) => part.trim());
    destCity = city;
    destState = state;
  }

  return {
    id: idAttr ?? null,
    equipment: equipment ?? null,
    origin: {
      city: originCity,
      state: originState,
    },
    destination: {
      city: destCity,
      state: destState,
    },
    totalMileage: parseNumber(milesText),
    rate: parseNumber(rateText),
    pickupDate: pickupText ?? null,
    deliveryDate: deliveryText ?? null,
    broker: {
      name: brokerText,
      phone: phoneText,
      email: emailText,
      mcNumber: mcText,
    },
    notes: null,
  };
}

export function closestRow(element: Element | null): Element | null {
  if (!element) return null;
  return element.closest('[role="row"], .result-row, [data-testid="posting-row"], article, li');
}
