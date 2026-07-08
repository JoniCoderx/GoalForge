import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Ticket, Plus, Pencil, Trash2, AlertTriangle, Power, PowerOff } from 'lucide-react';
import { consoleApi, ApiError, type CouponInput } from '@/lib/api';
import type { Coupon } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from './shared';

export function CouponsTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['console-coupons'],
    queryFn: consoleApi.coupons,
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const coupons = data?.coupons ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {coupons.length} coupon{coupons.length === 1 ? '' : 's'}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState label="Could not load coupons." onRetry={() => refetch()} />
      ) : !coupons.length ? (
        <EmptyState
          icon={<Ticket className="h-7 w-7" />}
          title="No coupons yet"
          description="Create a discount coupon to offer promotions."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New coupon
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {coupons.map((c, i) => (
            <CouponRow key={c.id} coupon={c} index={i} onEdit={() => setEditing(c)} onDelete={() => setDeleting(c)} />
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New coupon" size="lg">
        {creating && <CouponForm onClose={() => setCreating(false)} />}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit coupon" size="lg">
        {editing && <CouponForm key={editing.id} coupon={editing} onClose={() => setEditing(null)} />}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete coupon" size="sm">
        {deleting && <DeleteCouponConfirm coupon={deleting} onClose={() => setDeleting(null)} />}
      </Modal>
    </div>
  );
}

function CouponRow({
  coupon,
  index,
  onEdit,
  onDelete,
}: {
  coupon: Coupon;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const toggleMut = useMutation({
    mutationFn: () => consoleApi.updateCoupon(coupon.id, { active: !coupon.active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console-coupons'] });
      toast.success(coupon.active ? 'Coupon disabled' : 'Coupon enabled');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="card flex flex-wrap items-center gap-4 p-4"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-300">
        <Ticket className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold uppercase tracking-wide text-white">{coupon.code}</span>
          <Badge color="text-brand-300 bg-brand-500/10 border-brand-500/20">{coupon.discountPercent}% off</Badge>
          {coupon.active ? (
            <Badge color="text-brand-300 bg-brand-500/10 border-brand-500/20">Active</Badge>
          ) : (
            <Badge color="text-slate-400 bg-white/5 border-white/10">Disabled</Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500">
          <span>
            Used {coupon.usedCount}/{coupon.maxUses ?? '∞'}
          </span>
          <span>{coupon.expiresAt ? `Expires ${formatDate(coupon.expiresAt)}` : 'No expiry'}</span>
          {coupon.note && <span className="truncate">{coupon.note}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" loading={toggleMut.isPending} onClick={() => toggleMut.mutate()}>
          {coupon.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          <span className="hidden sm:inline">{coupon.active ? 'Disable' : 'Enable'}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${coupon.code}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${coupon.code}`}>
          <Trash2 className="h-4 w-4 text-rose-300" />
        </Button>
      </div>
    </motion.div>
  );
}

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function CouponForm({ coupon, onClose }: { coupon?: Coupon; onClose: () => void }) {
  const qc = useQueryClient();
  const editing = !!coupon;
  const [code, setCode] = useState(coupon?.code ?? '');
  const [discountPercent, setDiscountPercent] = useState(coupon?.discountPercent ?? 10);
  const [maxUses, setMaxUses] = useState(coupon?.maxUses != null ? String(coupon.maxUses) : '');
  const [expiresAt, setExpiresAt] = useState(toDateInput(coupon?.expiresAt ?? null));
  const [note, setNote] = useState(coupon?.note ?? '');

  const buildInput = (): CouponInput => ({
    code: code.trim().toUpperCase(),
    discountPercent,
    maxUses: maxUses.trim() ? Number(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    note: note.trim(),
  });

  const mut = useMutation({
    mutationFn: () => (editing ? consoleApi.updateCoupon(coupon!.id, buildInput()) : consoleApi.createCoupon(buildInput())),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console-coupons'] });
      toast.success(editing ? 'Coupon updated' : 'Coupon created');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Save failed'),
  });

  const valid = code.trim().length > 0 && discountPercent >= 1 && discountPercent <= 100;

  return (
    <div className="space-y-4">
      <Input
        label="Code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="SUMMER25"
        className="font-mono uppercase"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Discount %"
          type="number"
          min={1}
          max={100}
          value={discountPercent}
          onChange={(e) => setDiscountPercent(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        />
        <Input
          label="Max uses"
          type="number"
          min={1}
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Unlimited"
          hint="Leave blank for unlimited"
        />
      </div>
      <Input label="Expires at" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} hint="Leave blank for no expiry" />
      <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note (optional)" />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={mut.isPending} disabled={!valid} onClick={() => mut.mutate()}>
          {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Save changes' : 'Create coupon'}
        </Button>
      </div>
    </div>
  );
}

function DeleteCouponConfirm({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => consoleApi.deleteCoupon(coupon.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['console-coupons'] });
      toast.success('Coupon deleted');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-300">
          Delete coupon <span className="font-mono font-medium text-white">{coupon.code}</span>? This action cannot be
          undone.
        </p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={mut.isPending} onClick={() => mut.mutate()}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}
