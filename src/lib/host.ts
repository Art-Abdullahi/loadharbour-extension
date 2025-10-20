export function normalizeHost(host: string): string {
  return host.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
}

export function isAllowed(url: string, hosts: string[]): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return hosts.some((allowed) => {
      const normalized = normalizeHost(allowed);
      if (normalized.startsWith('*.')) {
        const domain = normalized.slice(2);
        return host === domain || host.endsWith(`.${domain}`);
      }
      return host === normalized;
    });
  } catch (err) {
    console.warn('Invalid URL for host check', url, err);
    return false;
  }
}
