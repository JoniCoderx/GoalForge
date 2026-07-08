import { describe, it, expect } from 'vitest';
import { generateContent } from '../services/content.service.js';
import { TEMPLATE_SEEDS } from '../data/templates.js';
import type { Template } from '@prisma/client';

function fakeTemplate(seed: (typeof TEMPLATE_SEEDS)[number]): Template {
  const now = new Date();
  return {
    id: seed.key,
    key: seed.key,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    icon: seed.icon,
    gradient: seed.gradient,
    accentColor: seed.accentColor,
    promptTemplate: seed.promptTemplate,
    sceneCount: seed.sceneCount,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
  };
}

describe('content generation (local fallback)', () => {
  it('produces a complete package for every template', async () => {
    for (const seed of TEMPLATE_SEEDS) {
      const { content, source } = await generateContent(fakeTemplate(seed), { topic: 'Test Topic' });
      expect(source).toBe('local');
      expect(content.hook.length).toBeGreaterThan(0);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.scenes.length).toBeGreaterThanOrEqual(4);
      expect(content.hashtags.length).toBeGreaterThanOrEqual(10);
      expect(content.hashtags.length).toBeLessThanOrEqual(20);
      expect(content.thumbnailText.length).toBeGreaterThan(0);
      expect(content.cta.length).toBeGreaterThan(0);
      for (const scene of content.scenes) {
        expect(scene.narration.length).toBeGreaterThan(0);
        expect(scene.durationSec).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for the same input', async () => {
    const t = fakeTemplate(TEMPLATE_SEEDS[0]);
    const a = await generateContent(t, { topic: 'Real Madrid vs Barcelona' });
    const b = await generateContent(t, { topic: 'Real Madrid vs Barcelona' });
    expect(a.content.hook).toBe(b.content.hook);
    expect(a.content.scenes.length).toBe(b.content.scenes.length);
  });

  it('generates hashtags without # symbols and unique', async () => {
    const { content } = await generateContent(fakeTemplate(TEMPLATE_SEEDS[2]), { topic: 'wingers' });
    const unique = new Set(content.hashtags);
    expect(unique.size).toBe(content.hashtags.length);
    for (const h of content.hashtags) expect(h.startsWith('#')).toBe(false);
  });
});
