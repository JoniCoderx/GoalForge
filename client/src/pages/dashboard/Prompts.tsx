import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { SlidersHorizontal, Save, RotateCcw, Info, FileText, AlertTriangle, Lock } from 'lucide-react';
import { api, describeApiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { Prompt } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

export default function Prompts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['prompts'],
    queryFn: api.prompts.list,
    refetchOnWindowFocus: false,
  });
  const prompts = useMemo(() => data?.prompts ?? [], [data]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => prompts.find((p) => p.key === selectedKey) ?? null,
    [prompts, selectedKey]
  );

  // Auto-select the first prompt once data arrives.
  useEffect(() => {
    if (!selectedKey && prompts.length > 0) {
      setSelectedKey(prompts[0].key);
    }
  }, [prompts, selectedKey]);

  // Sync editor content only when the SELECTED KEY changes, so a background
  // refetch (new object identity) never clobbers unsaved edits.
  useEffect(() => {
    const p = prompts.find((x) => x.key === selectedKey);
    if (p) setContent(p.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const dirty = selected !== null && content !== selected.content;

  const mutation = useMutation({
    mutationFn: (vars: { key: string; content: string }) => api.prompts.update(vars.key, vars.content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('Prompt saved ✨');
    },
    onError: () => toast.error('Could not save prompt. Try again.'),
  });

  const handleSelect = (p: Prompt) => {
    setSelectedKey(p.key);
    if (editorRef.current && window.matchMedia('(max-width: 1023px)').matches) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const save = () => {
    if (!selected || !dirty) return;
    mutation.mutate({ key: selected.key, content });
  };

  const reset = () => {
    if (selected) setContent(selected.content);
  };

  return (
    <div>
      <PageHeader
        icon={<SlidersHorizontal className="h-5 w-5" />}
        title="Prompt Editor"
        subtitle="Tune the AI prompts that drive your generations."
      />

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] px-4 py-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
        <p>
          These prompts feed the OpenAI content pipeline. The offline fallback generator ignores them, so
          changes here only affect live AI generations.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
          <div className="card p-6 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-7 w-7" />}
          title="Couldn't load prompts"
          description={describeApiError(error)}
        />
      ) : prompts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No prompts yet"
          description="Your AI prompts will appear here once they're configured for your workspace."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* List pane */}
          <div className="space-y-3">
            {prompts.map((p, i) => {
              const active = p.key === selectedKey;
              return (
                <motion.button
                  key={p.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelect(p)}
                  className={cn(
                    'card w-full p-4 text-left transition-all hover:border-white/20',
                    active && 'border-brand-500/50 bg-brand-500/[0.06] ring-1 ring-brand-500/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={cn('truncate font-display font-semibold', active ? 'text-white' : 'text-slate-200')}>
                      {p.name}
                    </h3>
                    <span className="chip shrink-0 border border-white/10 bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                      {p.category}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">{p.description}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Editor pane */}
          <div ref={editorRef}>
            {selected ? (
              <motion.div
                key={selected.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-white">{selected.name}</h2>
                      {selected.isSystem && (
                        <span className="chip border border-white/10 bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                          System
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{selected.description}</p>
                    <code className="mt-2 inline-block rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-brand-300">
                      {selected.key}
                    </code>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" onClick={reset} disabled={!dirty || mutation.isPending}>
                        <RotateCcw className="h-4 w-4" /> Reset
                      </Button>
                      <Button onClick={save} loading={mutation.isPending} disabled={!dirty}>
                        <Save className="h-4 w-4" /> {dirty ? 'Save' : 'Saved'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Textarea
                    label="Prompt content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={16}
                    spellCheck={false}
                    readOnly={!canEdit}
                    className="min-h-[320px] font-mono text-sm leading-relaxed"
                  />
                  {canEdit ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {dirty ? 'Unsaved changes' : 'No changes'} · {content.length.toLocaleString()} characters
                    </p>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Lock className="h-3.5 w-3.5" />
                      System prompts are managed by admins.
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <EmptyState
                icon={<FileText className="h-7 w-7" />}
                title="Select a prompt"
                description="Choose a prompt from the list to view and edit its content."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
