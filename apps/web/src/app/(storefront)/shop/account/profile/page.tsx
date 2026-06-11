'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sf, customerStore } from '@/lib/storefront';

interface Address {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  zip?: string | null;
  territoryCode?: string | null;
  zoneCode?: string | null;
  phoneNumber?: string | null;
}

const EMPTY_ADDR: Partial<Address> = {
  firstName: '', lastName: '', address1: '', address2: '',
  city: '', zip: '', territoryCode: 'IN', zoneCode: '', phoneNumber: '',
};

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState(false);
  const [editName, setEditName] = useState({ firstName: '', lastName: '' });
  const [editingAddr, setEditingAddr] = useState<Address | Partial<Address> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!customerStore.get()) { router.replace('/shop/account'); return; }
    load();
  }, [router]);

  async function load() {
    try {
      const [p, a] = await Promise.all([
        sf.get('/customer').then((r) => r.data),
        sf.get('/customer/addresses', { params: { first: 20 } }).then((r) => r.data),
      ]);
      setProfile(p);
      setEditName({ firstName: p.firstName ?? '', lastName: p.lastName ?? '' });
      setDefaultId(a.defaultAddressId);
      setAddresses(a.addresses.edges.map((e: any) => e.node));
      setErr(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to load');
    }
  }

  async function saveProfile() {
    setBusy(true);
    try {
      await sf.patch('/customer', editName);
      setEditProfile(false);
      load();
    } finally { setBusy(false); }
  }

  async function saveAddress() {
    if (!editingAddr) return;
    setBusy(true);
    const { id, ...address } = editingAddr as any;
    try {
      if (id) {
        await sf.patch('/customer/address', { address, defaultAddress: defaultId === id }, { params: { id } });
      } else {
        await sf.post('/customer/addresses', { address, defaultAddress: addresses.length === 0 });
      }
      setEditingAddr(null);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Save failed');
    } finally { setBusy(false); }
  }

  async function deleteAddress(id: string) {
    if (!confirm('Delete this address?')) return;
    setBusy(true);
    try {
      await sf.post('/customer/address/delete', null, { params: { id } });
      load();
    } finally { setBusy(false); }
  }

  async function setDefault(id: string) {
    const a = addresses.find((x) => x.id === id);
    if (!a) return;
    setBusy(true);
    try {
      const { id: _, ...rest } = a;
      await sf.patch('/customer/address', { address: rest, defaultAddress: true }, { params: { id } });
      load();
    } finally { setBusy(false); }
  }

  async function logoutAllDevices() {
    if (!confirm('Sign out of all devices?')) return;
    // No backend route yet — just clear local
    customerStore.clear();
    router.replace('/shop/account');
  }

  if (!profile) return <div className="p-4">{err ?? 'Loading…'}</div>;

  return (
    <div className="p-4 space-y-6 pb-8">
      <div className="flex gap-4 border-b text-sm">
        <Link href="/shop/account" className="pb-2 text-gray-500">Orders</Link>
        <span className="pb-2 border-b-2 border-black font-medium">Profile</span>
      </div>

      {/* Profile block */}
      <section className="border rounded p-4">
        {editProfile ? (
          <div className="space-y-2">
            <input
              value={editName.firstName}
              onChange={(e) => setEditName({ ...editName, firstName: e.target.value })}
              placeholder="First name"
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <input
              value={editName.lastName}
              onChange={(e) => setEditName({ ...editName, lastName: e.target.value })}
              placeholder="Last name"
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <div className="flex gap-2">
              <button onClick={saveProfile} disabled={busy} className="flex-1 bg-black text-white py-2 rounded text-sm">Save</button>
              <button onClick={() => setEditProfile(false)} className="flex-1 border py-2 rounded text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">
                {profile.firstName ?? ''} {profile.lastName ?? ''}
                {!profile.firstName && !profile.lastName && <span className="text-gray-500">No name set</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">Email</div>
              <div className="text-sm">{profile.emailAddress?.emailAddress}</div>
            </div>
            <button onClick={() => setEditProfile(true)} className="text-xs underline">Edit</button>
          </div>
        )}
      </section>

      {/* Addresses */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Addresses</h2>
          <button onClick={() => setEditingAddr({ ...EMPTY_ADDR })} className="text-xs underline">+ Add</button>
        </div>

        {addresses.length === 0 && !editingAddr && (
          <p className="text-sm text-gray-500">No addresses yet.</p>
        )}

        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="border rounded p-3 text-sm">
              {defaultId === a.id && (
                <div className="text-[10px] uppercase text-green-700 mb-1">Default</div>
              )}
              <div className="font-medium">{a.firstName} {a.lastName}</div>
              <div className="text-gray-700 text-xs whitespace-pre-line">
                {[a.address1, a.address2, `${a.city ?? ''}, ${a.zoneCode ?? ''} ${a.zip ?? ''}`, a.territoryCode, a.phoneNumber].filter(Boolean).join('\n')}
              </div>
              <div className="flex gap-3 mt-2 text-xs">
                <button onClick={() => setEditingAddr(a)} className="underline">Edit</button>
                {defaultId !== a.id && (
                  <button onClick={() => setDefault(a.id)} className="underline">Set default</button>
                )}
                <button onClick={() => deleteAddress(a.id)} className="underline text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {editingAddr && (
          <div className="border rounded p-3 mt-3 space-y-2 bg-gray-50">
            <div className="font-medium text-sm">{(editingAddr as any).id ? 'Edit address' : 'New address'}</div>
            {([
              ['firstName', 'First name'], ['lastName', 'Last name'],
              ['address1', 'Address line 1'], ['address2', 'Address line 2'],
              ['city', 'City'], ['zoneCode', 'State code (e.g. MH)'],
              ['zip', 'PIN code'], ['territoryCode', 'Country code (e.g. IN)'],
              ['phoneNumber', 'Phone'],
            ] as const).map(([k, label]) => (
              <input
                key={k}
                value={(editingAddr as any)[k] ?? ''}
                onChange={(e) => setEditingAddr({ ...editingAddr, [k]: e.target.value })}
                placeholder={label}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            ))}
            <div className="flex gap-2">
              <button onClick={saveAddress} disabled={busy} className="flex-1 bg-black text-white py-2 rounded text-sm">Save</button>
              <button onClick={() => setEditingAddr(null)} className="flex-1 border py-2 rounded text-sm">Cancel</button>
            </div>
          </div>
        )}
      </section>

      <div className="pt-4 border-t space-y-2">
        <button onClick={logoutAllDevices} className="w-full border border-red-300 text-red-600 py-2 rounded text-sm">
          Sign out of all devices
        </button>
      </div>
    </div>
  );
}
