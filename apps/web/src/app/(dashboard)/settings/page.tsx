'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const TABS = ['General', 'Shipping', 'Taxes', 'Payment'];

export default function SettingsPage() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button key={t} className="px-4 py-2 text-sm border-b-2 border-transparent hover:border-primary">{t}</button>
        ))}
      </div>
      <div className="bg-card border rounded-lg p-4">
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
