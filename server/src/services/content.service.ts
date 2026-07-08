import type { Template } from '@prisma/client';
import { chatJson } from './openai.service.js';
import { PROMPT_SEEDS } from '../data/prompts.js';
import {
  FOOTBALL_FACTS,
  SAMPLE_FIXTURES,
  TACTICS,
  TOP_CLUBS,
  TOP_PLAYERS,
  pick,
  shuffleSeeded,
} from '../data/football.js';
import type { GeneratedContent, Scene } from '../types/content.js';

interface GenerateOptions {
  topic?: string;
  tone?: string;
  audience?: string;
  directorPrompt?: string;
}

function seedFrom(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}

function defaultTopic(template: Template, seed: number): string {
  switch (template.key) {
    case 'match-predictions': {
      const f = pick(SAMPLE_FIXTURES, seed);
      return `${f.home} vs ${f.away}`;
    }
    case 'top-10-players':
      return 'the best players in the world right now';
    case 'player-spotlight':
      return pick(TOP_PLAYERS, seed).name;
    case 'transfer-news':
      return `${pick(TOP_PLAYERS, seed).name} transfer saga`;
    case 'tactical-analysis':
      return pick(TACTICS, seed).name;
    case 'best-goals':
      return 'the greatest goals ever scored';
    case 'football-rankings':
      return 'the biggest clubs in world football';
    case 'historic-moments':
      return 'the most iconic World Cup moments';
    case 'quiz-videos':
      return 'legendary football trivia';
    case 'football-facts':
    default:
      return 'mind-blowing football facts';
  }
}

const HASHTAG_POOL = [
  'football', 'soccer', 'futbol', 'goals', 'footballtiktok', 'soccertiktok',
  'championsleague', 'premierleague', 'laliga', 'seriea', 'bundesliga',
  'messi', 'ronaldo', 'mbappe', 'haaland', 'footballfacts', 'footballedit',
  'footballskills', 'transfernews', 'footballshorts', 'reels', 'fyp',
  'footballhighlights', 'worldcup', 'soccerlife',
];

function buildHashtags(template: Template, topic: string): string[] {
  const seed = seedFrom(template.key + topic);
  const topicWord = topic.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = shuffleSeeded(HASHTAG_POOL, seed).slice(0, 17);
  const extra = [template.category.toLowerCase().replace(/\s+/g, ''), topicWord].filter(
    (t): t is string => Boolean(t) && t.length > 2
  );
  return Array.from(new Set([...base.slice(0, 2), ...extra, ...base.slice(2)])).slice(0, 18);
}

/** Deterministic, high-quality fallback used when OpenAI is unavailable. */
function localGenerate(template: Template, topic: string): GeneratedContent {
  const seed = seedFrom(template.key + topic);
  const sceneCount = Math.max(4, Math.min(10, template.sceneCount));
  const scenes: Scene[] = [];

  const players = shuffleSeeded(TOP_PLAYERS, seed);
  const clubs = shuffleSeeded(TOP_CLUBS, seed);
  const facts = shuffleSeeded(FOOTBALL_FACTS, seed);

  const hook = ((): string => {
    switch (template.key) {
      case 'match-predictions':
        return `${topic}? Here's exactly how it plays out.`;
      case 'top-10-players':
        return `Number 1 will start a fight in the comments.`;
      case 'football-facts':
        return `This football fact broke my brain.`;
      case 'transfer-news':
        return `The ${topic} just changed everything.`;
      case 'best-goals':
        return `You have never seen goals like these.`;
      case 'quiz-videos':
        return `Only real fans score 5 out of 5.`;
      case 'tactical-analysis':
        return `This is why ${topic} is unstoppable.`;
      default:
        return `Wait for number 1… trust me.`;
    }
  })();

  for (let i = 0; i < sceneCount; i++) {
    const rank = sceneCount - i;
    let heading = '';
    let narration = '';
    let caption = '';
    let stat: string | undefined;

    if (i === 0) {
      heading = 'The Hook';
      narration = hook;
      caption = template.name.toUpperCase();
    } else if (template.key === 'top-10-players' || template.key === 'football-rankings') {
      const p = players[i % players.length];
      heading = `#${rank}`;
      narration = `At number ${rank}, ${p.name} of ${p.club}. ${p.fact}`;
      caption = `#${rank} ${p.name}`;
      stat = `${p.rating} OVR`;
    } else if (template.key === 'player-spotlight') {
      const p = players[i % players.length];
      heading = p.name;
      narration = `${p.name} plays as a ${p.position} for ${p.club}. ${p.fact}`;
      caption = p.name;
      stat = `${p.rating} OVR`;
    } else if (template.key === 'match-predictions') {
      const f = pick(SAMPLE_FIXTURES, seed + i);
      heading = i === 1 ? 'The Fixture' : i === 2 ? 'Key Battle' : 'Prediction';
      narration =
        i === 1
          ? `${topic} in the ${f.competition}. A fixture with everything on the line.`
          : i === sceneCount - 1
            ? `My prediction: a result that nobody will forget. ${f.prediction}`
            : `The midfield battle decides this one. Whoever controls tempo, wins.`;
      caption = heading.toUpperCase();
    } else if (template.key === 'tactical-analysis') {
      const t = TACTICS[i % TACTICS.length];
      heading = t.name;
      narration = `${t.name}: ${t.detail}`;
      caption = t.name.toUpperCase();
    } else if (template.key === 'transfer-news') {
      const p = players[i % players.length];
      heading = i === 1 ? 'The Deal' : i === 2 ? 'The Fee' : 'What It Means';
      narration =
        i === 1
          ? `${p.name} is at the centre of the biggest story of the window.`
          : `This move reshapes the balance of power at ${p.club}.`;
      caption = heading.toUpperCase();
    } else if (template.key === 'quiz-videos') {
      heading = `Question ${i}`;
      narration = `Question ${i}: ${facts[i % facts.length]} True or false?`;
      caption = `Q${i}`;
    } else if (template.key === 'best-goals') {
      const p = players[i % players.length];
      heading = `Goal ${rank}`;
      narration = `${p.name} with a strike that defied physics. Absolute cinema.`;
      caption = `${p.name} 🚀`;
    } else if (template.key === 'historic-moments') {
      const c = clubs[i % clubs.length];
      heading = 'On This Day';
      narration = `${c.name}: ${c.fact} A moment written into football history.`;
      caption = c.name.toUpperCase();
    } else {
      heading = `Fact ${i}`;
      narration = facts[i % facts.length];
      caption = `FACT ${i}`;
    }

    const words = narration.split(/\s+/).length;
    const durationSec = Math.max(2.4, Math.min(6, +(words / 2.6).toFixed(1)));
    scenes.push({ index: i, heading, narration, caption, durationSec, stat });
  }

  const script = scenes.map((s) => s.narration).join(' ');
  const title = `${template.name}: ${topic}`.slice(0, 90);
  const cta = 'Follow for daily football content ⚽ Which one is your pick?';

  return {
    topic,
    title,
    hook,
    script,
    scenes,
    caption: `${hook} ${cta}`,
    hashtags: buildHashtags(template, topic),
    tiktokDescription: `${hook} 👀 Who agrees? #football ${buildHashtags(template, topic).slice(0, 6).map((h) => `#${h}`).join(' ')}`,
    instagramDescription: `⚽ ${title}\n\n${hook}\n\nDrop your take below 👇\n\n${buildHashtags(template, topic).map((h) => `#${h}`).join(' ')}`,
    youtubeDescription: `${title}\n\n${hook}\n\nSubscribe for daily football shorts. In this video we break down ${topic}. #shorts #football #soccer`,
    thumbnailText: (scenes[0]?.caption || template.name).slice(0, 22).toUpperCase(),
    cta,
  };
}

function coerceContent(
  raw: Partial<GeneratedContent> & { scenes?: unknown },
  template: Template,
  topic: string
): GeneratedContent {
  const base = localGenerate(template, topic);
  const scenes: Scene[] = Array.isArray(raw.scenes)
    ? (raw.scenes as any[]).slice(0, 10).map((s, i) => {
        const narration = String(s?.narration ?? s?.text ?? base.scenes[i]?.narration ?? '').trim();
        const words = narration.split(/\s+/).length;
        return {
          index: i,
          heading: String(s?.heading ?? s?.title ?? `Scene ${i + 1}`).slice(0, 60),
          narration,
          caption: String(s?.caption ?? narration.split(' ').slice(0, 5).join(' ')).slice(0, 48),
          durationSec: Math.max(2.2, Math.min(6, Number(s?.durationSec) || +(words / 2.6).toFixed(1))),
          stat: s?.stat ? String(s.stat).slice(0, 16) : undefined,
        } satisfies Scene;
      })
    : base.scenes;

  const hashtags = Array.isArray(raw.hashtags) && raw.hashtags.length
    ? Array.from(new Set(raw.hashtags.map((h) => String(h).replace(/^#/, '').trim().toLowerCase()).filter(Boolean))).slice(0, 20)
    : base.hashtags;

  return {
    topic,
    title: String(raw.title ?? base.title).slice(0, 100),
    hook: String(raw.hook ?? base.hook).slice(0, 140),
    script: String(raw.script ?? scenes.map((s) => s.narration).join(' ')).trim() || base.script,
    scenes,
    caption: String(raw.caption ?? base.caption).slice(0, 300),
    hashtags,
    tiktokDescription: String(raw.tiktokDescription ?? base.tiktokDescription).slice(0, 500),
    instagramDescription: String(raw.instagramDescription ?? base.instagramDescription).slice(0, 700),
    youtubeDescription: String(raw.youtubeDescription ?? base.youtubeDescription).slice(0, 900),
    thumbnailText: String(raw.thumbnailText ?? base.thumbnailText).slice(0, 24).toUpperCase(),
    cta: String(raw.cta ?? base.cta).slice(0, 160),
  };
}

/**
 * Generate the full content package for a template + topic. Uses OpenAI when
 * configured; otherwise falls back to the deterministic local generator.
 */
export async function generateContent(
  template: Template,
  options: GenerateOptions = {}
): Promise<{ content: GeneratedContent; source: 'openai' | 'local' }> {
  const seed = seedFrom(template.key + (options.topic ?? ''));
  const topic = (options.topic && options.topic.trim()) || defaultTopic(template, seed);

  const director =
    options.directorPrompt || PROMPT_SEEDS.find((p) => p.key === 'system.director')?.content || '';

  const system = `${director}\nRespond ONLY with a valid JSON object. Do not include markdown.`;
  const prompt = template.promptTemplate.replace(/\{\{topic\}\}/g, topic);
  const user = `${prompt}
Audience: ${options.audience || 'football fans aged 16-30 on TikTok'}.
Tone: ${options.tone || 'energetic, confident, punchy'}.
Produce exactly ${template.sceneCount} scenes.

Return JSON with this exact shape:
{
  "title": string,
  "hook": string (max 12 words, scroll-stopping),
  "scenes": [{ "heading": string, "narration": string (1-2 sentences), "caption": string (3-6 words, Title Case), "stat": string (optional short stat) }],
  "caption": string,
  "hashtags": string[] (15-20, no # symbol),
  "tiktokDescription": string,
  "instagramDescription": string,
  "youtubeDescription": string,
  "thumbnailText": string (max 3 words, UPPERCASE),
  "cta": string
}`;

  const raw = await chatJson<Partial<GeneratedContent>>({ system, user, temperature: 0.9 });
  if (raw) {
    return { content: coerceContent(raw, template, topic), source: 'openai' };
  }
  return { content: localGenerate(template, topic), source: 'local' };
}

/** Regenerate a single field (used by inline "regenerate" buttons). */
export async function regenerateField(
  template: Template,
  field: keyof GeneratedContent,
  topic: string,
  context: string
): Promise<string | string[]> {
  const full = await generateContent(template, { topic });
  const value = full.content[field];
  void context;
  return value as string | string[];
}
