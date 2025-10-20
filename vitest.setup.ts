const storageData = new Map<string, unknown>();

(globalThis as any).chrome = {
  runtime: {
    id: 'test-runtime-id',
  },
  storage: {
    local: {
      async get(key: string | string[]) {
        if (Array.isArray(key)) {
          const result: Record<string, unknown> = {};
          for (const k of key) {
            result[k] = storageData.get(k);
          }
          return result;
        }
        return { [key]: storageData.get(key as string) };
      },
      async set(items: Record<string, unknown>) {
        Object.entries(items).forEach(([k, v]) => storageData.set(k, v));
      },
    },
  },
};
