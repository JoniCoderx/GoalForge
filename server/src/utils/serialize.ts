import type { Video } from '@prisma/client';
import { parseJson } from './http.js';
import type { Scene } from '../types/content.js';

/** Convert a DB Video row (JSON-in-TEXT columns) into an API-friendly object. */
export function serializeVideo(v: Video) {
  return {
    id: v.id,
    userId: v.userId,
    title: v.title,
    topic: v.topic,
    templateKey: v.templateKey,
    status: v.status,
    hook: v.hook,
    script: v.script,
    scenes: parseJson<Scene[]>(v.scenes, []),
    caption: v.caption,
    hashtags: parseJson<string[]>(v.hashtags, []),
    tiktokDescription: v.tiktokDescription,
    instagramDescription: v.instagramDescription,
    youtubeDescription: v.youtubeDescription,
    thumbnailText: v.thumbnailText,
    cta: v.cta,
    videoPath: v.videoPath,
    thumbnailPath: v.thumbnailPath,
    durationSec: v.durationSec,
    width: v.width,
    height: v.height,
    fps: v.fps,
    views: v.views,
    likes: v.likes,
    shares: v.shares,
    error: v.error,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

export type SerializedVideo = ReturnType<typeof serializeVideo>;
