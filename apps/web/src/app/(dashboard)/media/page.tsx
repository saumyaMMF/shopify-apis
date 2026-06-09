'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function MediaPage() {
  const { data } = useQuery({
    queryKey: ['media'],
    queryFn: async () => (await api.get('/media')).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Media Library</h1>
      <div className="grid grid-cols-4 gap-4">
        {data?.map((m: any) => (
          <div key={m.id} className="bg-card border rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt="" className="w-full h-32 object-cover" />
            <div className="p-2 text-xs truncate">{m.cdnKey}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
