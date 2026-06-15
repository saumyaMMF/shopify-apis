'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sf, customerStore, apiErrorMessage } from '@/lib/storefront';
import { Button, Skeleton, EmptyState, ErrorState, Spinner, cx } from '@/components/ui';
import { CheckIcon } from '@/components/ui/icons';

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

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20';
const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className={inputCls}
      />
    </div>
  );
}

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!customerStore.get()) { router.replace('/shop/account'); return; }
    load();
  }, [router]);

  async function load() {
    setLoadFailed(false);
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
      setLoadFailed(true);
    }
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveProfile() {
    setBusy(true);
    setSaveErr(null);
    try {
      await sf.patch('/customer', editName);
      setEditProfile(false);
      flashSaved();
      load();
    } catch (e: any) {
      setSaveErr(apiErrorMessage(e));
    } finally { setBusy(false); }
  }

  async function saveAddress() {
    if (!editingAddr) return;
    setBusy(true);
    setSaveErr(null);
    const { id, ...address } = editingAddr as any;
    try {
      if (id) {
        await sf.patch('/customer/address', { address, defaultAddress: defaultId === id }, { params: { id } });
      } else {
        await sf.post('/customer/addresses', { address, defaultAddress: addresses.length === 0 });
      }
      setEditingAddr(null);
      flashSaved();
      load();
    } catch (e: any) {
      setSaveErr(apiErrorMessage(e));
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

  if (loadFailed && !profile) {
    return (
      <div className="p-4">
        <ErrorState onRetry={load} message={err ?? undefined} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex gap-4 border-b text-sm pb-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-8">
      <div className="flex gap-5 border-b text-sm">
        <Link href="/shop/account" className="pb-2 text-gray-500 hover:text-black transition-colors">Orders</Link>
        <span className="pb-2 border-b-2 border-black font-semibold">Profile</span>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <CheckIcon className="w-4 h-4" />
          Saved
        </div>
      )}

      {/* Profile block */}
      <section className="rounded-lg border p-4">
        {editProfile ? (
          <div className="space-y-3">
            <Field
              id="firstName"
              label="First name"
              value={editName.firstName}
              onChange={(v) => setEditName({ ...editName, firstName: v })}
            />
            <Field
              id="lastName"
              label="Last name"
              value={editName.lastName}
              onChange={(v) => setEditName({ ...editName, lastName: v })}
            />
            {saveErr && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveErr}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={saveProfile} disabled={busy} className="flex-1">
                {busy && <Spinner className="w-4 h-4" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => { setEditProfile(false); setSaveErr(null); }}
                disabled={busy}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold">
                {profile.firstName ?? ''} {profile.lastName ?? ''}
                {!profile.firstName && !profile.lastName && <span className="text-gray-500">No name set</span>}
              </div>
              <div className="text-xs text-gray-500 mt-2">Email</div>
              <div className="text-sm truncate">{profile.emailAddress?.emailAddress}</div>
            </div>
            <button
              onClick={() => { setEditProfile(true); setSaveErr(null); }}
              className="shrink-0 text-xs font-medium text-gray-600 underline hover:text-black"
            >
              Edit
            </button>
          </div>
        )}
      </section>

      {/* Addresses */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Addresses</h2>
          <button
            onClick={() => { setEditingAddr({ ...EMPTY_ADDR }); setSaveErr(null); }}
            className="text-xs font-medium text-gray-600 underline hover:text-black"
          >
            + Add
          </button>
        </div>

        {addresses.length === 0 && !editingAddr && (
          <EmptyState
            title="No addresses yet"
            description="Add a shipping address to speed up checkout."
            action={
              <Button onClick={() => { setEditingAddr({ ...EMPTY_ADDR }); setSaveErr(null); }}>
                Add address
              </Button>
            }
          />
        )}

        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-lg border p-4 text-sm">
              {defaultId === a.id && (
                <div className="mb-1.5 inline-block rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                  Default
                </div>
              )}
              <div className="font-medium">{a.firstName} {a.lastName}</div>
              <div className="mt-1 text-xs leading-relaxed text-gray-600 whitespace-pre-line">
                {[a.address1, a.address2, `${a.city ?? ''}, ${a.zoneCode ?? ''} ${a.zip ?? ''}`, a.territoryCode, a.phoneNumber].filter(Boolean).join('\n')}
              </div>
              <div className="mt-3 flex gap-4 text-xs">
                <button onClick={() => { setEditingAddr(a); setSaveErr(null); }} className="font-medium underline hover:text-black">Edit</button>
                {defaultId !== a.id && (
                  <button onClick={() => setDefault(a.id)} disabled={busy} className="font-medium underline hover:text-black disabled:opacity-50">Set default</button>
                )}
                <button onClick={() => deleteAddress(a.id)} disabled={busy} className="font-medium text-red-600 underline hover:text-red-700 disabled:opacity-50">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {editingAddr && (
          <div className="mt-3 rounded-lg border bg-gray-50 p-4 space-y-3">
            <div className="text-sm font-semibold">{(editingAddr as any).id ? 'Edit address' : 'New address'}</div>
            {([
              ['firstName', 'First name'], ['lastName', 'Last name'],
              ['address1', 'Address line 1'], ['address2', 'Address line 2'],
              ['city', 'City'], ['zoneCode', 'State code (e.g. MH)'],
              ['zip', 'PIN code'], ['territoryCode', 'Country code (e.g. IN)'],
              ['phoneNumber', 'Phone'],
            ] as const).map(([k, label]) => (
              <Field
                key={k}
                id={`addr-${k}`}
                label={label}
                value={(editingAddr as any)[k] ?? ''}
                onChange={(v) => setEditingAddr({ ...editingAddr, [k]: v })}
              />
            ))}
            {saveErr && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{saveErr}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={saveAddress} disabled={busy} className="flex-1">
                {busy && <Spinner className="w-4 h-4" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => { setEditingAddr(null); setSaveErr(null); }}
                disabled={busy}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={logoutAllDevices}
          size="lg"
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          Sign out of all devices
        </Button>
      </div>
    </div>
  );
}
