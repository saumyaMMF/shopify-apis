'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const TYPES = ['HEADER_MENU', 'FOOTER_MENU', 'HERO_BANNER', 'HOMEPAGE_SECTION', 'PAGE', 'FAQ', 'BLOG_POST'];

export default function CmsPage() {
  const { data } = useQuery({
    queryKey: ['cms'],
    queryFn: async () => (await api.get('/cms')).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">CMS</h1>
      <div className="grid grid-cols-3 gap-4">
        {TYPES.map((t) => {
          const items = data?.filter((b: any) => b.type === t) ?? [];
          return (
            <div key={t} className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold text-sm">{t.replace('_', ' ')}</h3>
              <p className="text-xs text-muted-foreground mb-2">{items.length} blocks</p>
              <ul className="text-sm space-y-1">
                {items.map((b: any) => (
                  <li key={b.id} className="flex justify-between">
                    <span>{b.handle}</span>
                    <span className="text-xs text-muted-foreground">{b.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
