import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { expensesApi, ApiError } from '@/lib/api';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { QK, IMPORT_COLUMNS } from './utils';

export function ImportForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<{ imported: number; total: number; errors: string[] } | null>(null);

  const mut = useMutation({
    mutationFn: () => expensesApi.importCsv(csv),
    onSuccess: (res) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.expenses });
      qc.invalidateQueries({ queryKey: QK.categories });
      if (res.imported > 0) toast.success(`Imported ${res.imported} of ${res.total}`);
      else toast.error('Nothing imported — check the errors');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Import failed'),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400">
        Paste CSV with a header row. Expected columns:
        <span className="mt-1 block font-mono text-[11px] text-slate-300">{IMPORT_COLUMNS}</span>
      </div>

      <Textarea
        label="CSV data"
        name="import-csv"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        className="min-h-[180px] font-mono text-xs"
        placeholder={`project,title,category,vendor,paymentMethod,amount,currency,datePaid,isRecurring,recurringFrequency,nextPaymentDate,status,notes,addedBy\nWebsite,Figma,Software,Figma,Company card,15,USD,2026-01-01,true,monthly,2026-02-01,paid,,Alex`}
      />

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-2.5 text-sm text-brand-200">
            <CheckCircle2 className="h-4 w-4" />
            Imported {result.imported} of {result.total} rows.
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
              <p className="mb-1 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> {result.errors.length} row(s) skipped
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="font-mono">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
          {result ? 'Done' : 'Cancel'}
        </Button>
        <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!csv.trim()}>
          <Upload className="h-4 w-4" /> Import
        </Button>
      </div>
    </div>
  );
}
