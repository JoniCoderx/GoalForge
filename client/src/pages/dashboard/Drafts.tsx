import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Pencil, Plus } from 'lucide-react';
import { api, describeApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { VideoCard } from '@/components/dashboard/VideoCard';

export default function Drafts() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['videos', 'DRAFT'],
    queryFn: () => api.videos.list('DRAFT'),
  });

  const drafts = data?.videos ?? [];

  return (
    <div>
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title="Drafts"
        subtitle="Unrendered content, ready to polish and export."
        actions={
          <Link to="/app/create">
            <Button>
              <Plus className="h-4 w-4" /> Create
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="Couldn't load drafts"
          description={describeApiError(error)}
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No drafts"
          description="Every idea starts as a draft. Create one and it will land here until you render it."
          action={
            <Link to="/app/create">
              <Button>
                <Plus className="h-4 w-4" /> Create a draft
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {drafts.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
              className="group relative"
            >
              <VideoCard video={v} index={i} />
              <Link
                to={`/app/videos/${v.id}`}
                className="btn-secondary absolute right-5 top-5 z-10 px-2.5 py-1.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
