'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const has = useAuthStore((s) => s.has);

  const { data: po, isLoading } = useQuery({
    queryKey: ['po', id],
    queryFn: async () => (await api.get(`/purchase-orders/${id}`)).data,
  });

  const submit = useMutation({
    mutationFn: async () => (await api.patch(`/purchase-orders/${id}/submit`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });
  const approve = useMutation({
    mutationFn: async () => (await api.patch(`/purchase-orders/${id}/approve`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });
  const cancel = useMutation({
    mutationFn: async () => (await api.patch(`/purchase-orders/${id}/cancel`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });
  const receiveAll = useMutation({
    mutationFn: async () =>
      (await api.post(`/purchase-orders/${id}/receive`, {
        items: po.items
          .filter((i: any) => i.receivedQty < i.orderedQty)
          .map((i: any) => ({ poItemId: i.id, quantity: i.orderedQty - i.receivedQty })),
      })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po', id] }),
  });

  if (isLoading || !po) return <div>Loading…</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{po.poNumber}</h1>
          <p className="text-sm text-muted-foreground">{po.vendor?.name} • {po.status.replace('_', ' ')}</p>
        </div>
        <div className="flex gap-2">
          {po.status === 'DRAFT' && (
            <button onClick={() => submit.mutate()} className="border rounded-md px-3 py-2 text-sm">Submit for approval</button>
          )}
          {po.status === 'PENDING_APPROVAL' && has('po.approve') && (
            <button onClick={() => approve.mutate()} className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm">Approve</button>
          )}
          {['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status) && has('po.receive') && (
            <button onClick={() => receiveAll.mutate()} className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm">
              Receive all remaining
            </button>
          )}
          {!['RECEIVED', 'CANCELLED', 'CLOSED'].includes(po.status) && has('po.approve') && (
            <button onClick={() => cancel.mutate()} className="border border-destructive text-destructive rounded-md px-3 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">SKU</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-right px-4 py-2 font-medium">Ordered</th>
              <th className="text-right px-4 py-2 font-medium">Received</th>
              <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
              <th className="text-right px-4 py-2 font-medium">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it: any) => (
              <tr key={it.id} className="border-t">
                <td className="px-4 py-2">{it.sku}</td>
                <td className="px-4 py-2">{it.title}</td>
                <td className="px-4 py-2 text-right">{it.orderedQty}</td>
                <td className="px-4 py-2 text-right">{it.receivedQty}</td>
                <td className="px-4 py-2 text-right">{Number(it.unitCost).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">{Number(it.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t flex justify-end gap-8 text-sm">
          <div><span className="text-muted-foreground">Subtotal: </span>{Number(po.subtotal).toFixed(2)}</div>
          <div><span className="text-muted-foreground">Tax: </span>{Number(po.tax).toFixed(2)}</div>
          <div><span className="text-muted-foreground">Shipping: </span>{Number(po.shipping).toFixed(2)}</div>
          <div className="font-semibold">Total: {po.currency} {Number(po.total).toFixed(2)}</div>
        </div>
      </div>

      {po.receipts?.length > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Goods Receipts</h2>
          <ul className="text-sm space-y-1">
            {po.receipts.map((r: any) => (
              <li key={r.id}>{r.grNumber} — received {new Date(r.receivedAt).toLocaleString()}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
