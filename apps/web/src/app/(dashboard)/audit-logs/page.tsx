'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AuditLogsPage() {
  const { data } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.get('/audit-logs')).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">When</th>
              <th className="text-left px-4 py-2 font-medium">User</th>
              <th className="text-left px-4 py-2 font-medium">Action</th>
              <th className="text-left px-4 py-2 font-medium">Resource</th>
              <th className="text-left px-4 py-2 font-medium">Diff</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((l: any) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">{l.user?.email}</td>
                <td className="px-4 py-2">{l.action}</td>
                <td className="px-4 py-2">{l.resource} {l.resourceId ?? ''}</td>
                <td className="px-4 py-2 text-xs"><pre>{JSON.stringify(l.diff)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
