import { useQuery } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { api } from '@/lib/api';

export function AiStatusPill() {
  const { data } = useQuery({ queryKey: ['ai-status'], queryFn: api.ai.status, staleTime: 60_000 });
  const configured = data?.configured;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            configured ? 'animate-ping bg-brand-400' : 'bg-amber-400'
          }`}
        />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${configured ? 'bg-brand-500' : 'bg-amber-500'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
          <Cpu className="h-3.5 w-3.5" /> AI Engine
        </p>
        <p className="truncate text-[11px] text-slate-500">
          {configured ? `OpenAI · ${data?.model}` : 'Local generator'}
        </p>
      </div>
    </div>
  );
}
