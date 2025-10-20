import type { Settings, VisiblePosting } from '../types/shared';

const VAR_PATTERN = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;

export type TemplateContext = Record<string, string>;

export function render(template: string, context: TemplateContext): string {
  return template.replace(VAR_PATTERN, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = context[key];
    return value ?? '';
  });
}

export function buildContext(post: VisiblePosting, settings: Settings): TemplateContext {
  const rate = post.rate != null ? `$${post.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '';
  const totalMileage = post.totalMileage != null ? String(post.totalMileage) : '';
  const date = new Date().toLocaleDateString();

  return {
    origin_city: post.origin.city,
    origin_state: post.origin.state,
    destination_city: post.destination.city,
    destination_state: post.destination.state,
    total_mileage: totalMileage,
    rate,
    date,
    company: settings.company.name,
    mc: settings.company.mc,
    phone: settings.company.phone,
    broker_name: post.broker.name,
    broker_phone: post.broker.phone ?? '',
    broker_email: post.broker.email ?? '',
  };
}

const MAILTO_MAX = 1800;

export function renderEmail(post: VisiblePosting, settings: Settings): { subject: string; body: string } {
  const ctx = buildContext(post, settings);
  const subject = render(settings.emailTemplate.subject, ctx);
  const body = render(settings.emailTemplate.body, ctx);
  return { subject, body };
}

export function buildMailto(post: VisiblePosting, settings: Settings): string {
  const { subject, body } = renderEmail(post, settings);
  const target = post.broker.email ?? '';
  const subjectLimited = subject.slice(0, MAILTO_MAX);
  const bodyLimited = body.slice(0, MAILTO_MAX);
  const params = new URLSearchParams();
  if (subjectLimited) params.set('subject', subjectLimited);
  if (bodyLimited) params.set('body', bodyLimited);
  if (settings.identity.senderEmail) {
    params.set('cc', settings.identity.senderEmail);
  }
  const query = params.toString();
  return `mailto:${encodeURIComponent(target)}${query ? `?${query}` : ''}`;
}
