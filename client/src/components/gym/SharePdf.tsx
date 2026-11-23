import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Share2 } from 'lucide-react';
import { buildWorkoutPdf, sharePdf } from '@/lib/workoutPdf';
import { GymButton } from './shared';

/**
 * Builds the PDF as soon as it's shown, so the tap opens the share sheet
 * immediately (iPhone only allows sharing directly from a tap).
 */
export function SharePdfButton({ sessionId, memberName, variant = 'lime' }: { sessionId: string; memberName: string; variant?: 'lime' | 'soft' }) {
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFile(null);
    setFailed(false);
    buildWorkoutPdf(sessionId, memberName)
      .then((f) => alive && setFile(f))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [sessionId, memberName]);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  return (
    <GymButton
      variant={variant}
      className="w-full"
      loading={!file && !failed}
      disabled={failed}
      onClick={async () => {
        if (!file) return;
        const r = await sharePdf(file);
        if (r === 'downloaded') toast.success('ה-PDF ירד למכשיר');
      }}
    >
      {canShare ? <Share2 className="h-5 w-5" /> : <FileDown className="h-5 w-5" />}
      {failed ? 'לא הצלחנו ליצור PDF' : canShare ? 'שיתוף סיכום PDF' : 'הורדת סיכום PDF'}
    </GymButton>
  );
}
