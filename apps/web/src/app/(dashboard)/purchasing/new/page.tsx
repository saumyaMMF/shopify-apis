'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/api';

interface POItem { variantId: string; sku: string; title: string; qty: number; unitCost: number }

export default function NewPOPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItem[]>([{ variantId: '', sku: '', title: '', qty: 1, unitCost: 0 }]);

  const { data: vendors } = useQuery({
    queryKey: ['vendors'], queryFn: async () => (await api.get('/vendors')).data,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/purchase-orders', {
      vendorId, locationId, expectedAt: expectedAt || undefined, notes, items,
    })).data,
    onSuccess: (po) => router.push(`/purchasing/${po.id}`),
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">New Purchase Order</h1>

      <div className="bg-card border rounded-lg p-6 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Vendor</label>
          <select className="w-full border rounded-md px-3 py-2 text-sm" value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {vendors?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Destination Location</label>
          <input className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Location ID"
            value={locationId} onChange={(e) => setLocationId(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Expected Date</label>
          <input type="date" className="w-full border rounded-md px-3 py-2 text-sm"
            value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
        </div>
        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Notes</label>
          <textarea className="w-full border rounded-md px-3 py-2 text-sm" rows={2}
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Line Items</h2>
          <button
            onClick={() => setItems([...items, { variantId: '', sku: '', title: '', qty: 1, unitCost: 0 }])}
            className="flex items-center gap-1 text-sm text-primary"
          >
            <Plus className="h-4 w-4" /> Add line
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Variant ID</th>
              <th className="text-left px-4 py-2 font-medium">SKU</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-right px-4 py-2 font-medium">Qty</th>
              <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
              <th className="text-right px-4 py-2 font-medium">Line Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-2 py-1"><input className="border rounded-md px-2 py-1 text-sm w-full" value={it.variantId}
                  onChange={(e) => updateItem(idx, { variantId: e.target.value })} /></td>
                <td className="px-2 py-1"><input className="border rounded-md px-2 py-1 text-sm w-full" value={it.sku}
                  onChange={(e) => updateItem(idx, { sku: e.target.value })} /></td>
                <td className="px-2 py-1"><input className="border rounded-md px-2 py-1 text-sm w-full" value={it.title}
                  onChange={(e) => updateItem(idx, { title: e.target.value })} /></td>
                <td className="px-2 py-1"><input type="number" className="border rounded-md px-2 py-1 text-sm w-20 text-right"
                  value={it.qty} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} /></td>
                <td className="px-2 py-1"><input type="number" step="0.01" className="border rounded-md px-2 py-1 text-sm w-24 text-right"
                  value={it.unitCost} onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) })} /></td>
                <td className="px-2 py-1 text-right">{(it.qty * it.unitCost).toFixed(2)}</td>
                <td className="px-2 py-1">
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t flex justify-end gap-8 text-sm">
          <div><span className="text-muted-foreground">Subtotal: </span><span className="font-semibold">{subtotal.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => router.back()} className="border rounded-md px-4 py-2 text-sm">Cancel</button>
        <button
          onClick={() => create.mutate()}
          disabled={!vendorId || !locationId || !items.length || create.isPending}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {create.isPending ? 'Creating…' : 'Create PO'}
        </button>
      </div>
    </div>
  );

  function updateItem(idx: number, patch: Partial<POItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
}
