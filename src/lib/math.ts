import type { VisiblePosting } from '../types/shared';

export function computeRpm(post: VisiblePosting, deadhead: number): number | null {
  if (post.rate == null) return null;
  const miles = (post.totalMileage ?? 0) + (Number.isFinite(deadhead) ? deadhead : 0);
  if (miles <= 0) return null;
  return Math.round(((post.rate ?? 0) / miles) * 100) / 100;
}

export function formatPostingText(post: VisiblePosting): string {
  const parts: string[] = [];
  parts.push(`${post.origin.city}, ${post.origin.state} → ${post.destination.city}, ${post.destination.state}`);
  if (post.totalMileage != null) parts.push(`Miles: ${post.totalMileage}`);
  if (post.rate != null) parts.push(`Rate: $${post.rate}`);
  if (post.equipment) parts.push(`Equipment: ${post.equipment}`);
  parts.push(`Broker: ${post.broker.name}`);
  if (post.broker.phone) parts.push(`Phone: ${post.broker.phone}`);
  if (post.broker.email) parts.push(`Email: ${post.broker.email}`);
  return parts.join('\n');
}
