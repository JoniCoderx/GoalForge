export interface TemplateSeed {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  gradient: string;
  accentColor: string;
  sceneCount: number;
  promptTemplate: string;
}

/** The built-in content templates that power one-click generation. */
export const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    key: 'match-predictions',
    name: 'Match Predictions',
    description: 'AI-driven previews and score predictions for upcoming fixtures.',
    category: 'Predictions',
    icon: '🔮',
    gradient: 'from-violet-500 to-fuchsia-500',
    accentColor: '#a855f7',
    sceneCount: 6,
    promptTemplate:
      'Create a punchy match-prediction short about {{topic}}. Preview the fixture, key players, tactical battle, and give a bold scoreline prediction.',
  },
  {
    key: 'football-facts',
    name: 'Football Facts',
    description: 'Surprising, share-worthy facts that stop the scroll.',
    category: 'Facts',
    icon: '🤯',
    gradient: 'from-amber-500 to-orange-500',
    accentColor: '#f59e0b',
    sceneCount: 6,
    promptTemplate:
      'Create a fast-paced football facts short about {{topic}}. Each scene reveals one jaw-dropping fact with a surprising twist.',
  },
  {
    key: 'top-10-players',
    name: 'Top 10 Players',
    description: 'Ranked countdowns of the best players by position or era.',
    category: 'Rankings',
    icon: '🏆',
    gradient: 'from-yellow-400 to-amber-500',
    accentColor: '#eab308',
    sceneCount: 8,
    promptTemplate:
      'Create a countdown short ranking the top players for {{topic}}. Build suspense from number 10 down to number 1.',
  },
  {
    key: 'best-goals',
    name: 'Best Goals',
    description: 'Cinematic breakdowns of unforgettable goals.',
    category: 'Highlights',
    icon: '⚡',
    gradient: 'from-emerald-500 to-teal-500',
    accentColor: '#10b981',
    sceneCount: 6,
    promptTemplate:
      'Create a dramatic short celebrating the best goals related to {{topic}}. Describe the build-up, the strike, and the emotion.',
  },
  {
    key: 'transfer-news',
    name: 'Transfer News',
    description: 'Snappy transfer round-ups and rumour breakdowns.',
    category: 'News',
    icon: '📰',
    gradient: 'from-sky-500 to-blue-600',
    accentColor: '#0ea5e9',
    sceneCount: 6,
    promptTemplate:
      'Create a transfer-news short summarising the latest movement around {{topic}}. Cover the deal, the fee, and what it means.',
  },
  {
    key: 'player-spotlight',
    name: 'Player Spotlight',
    description: 'Deep-dive profiles that celebrate a single star.',
    category: 'Profiles',
    icon: '🌟',
    gradient: 'from-rose-500 to-pink-600',
    accentColor: '#f43f5e',
    sceneCount: 6,
    promptTemplate:
      'Create a player-spotlight short about {{topic}}. Cover their rise, signature skill, standout stats, and legacy.',
  },
  {
    key: 'tactical-analysis',
    name: 'Tactical Analysis',
    description: 'Break down formations, pressing traps and game plans.',
    category: 'Analysis',
    icon: '📊',
    gradient: 'from-indigo-500 to-violet-600',
    accentColor: '#6366f1',
    sceneCount: 7,
    promptTemplate:
      'Create a tactical-analysis short explaining {{topic}}. Break down the system, key roles, strengths and weaknesses in simple terms.',
  },
  {
    key: 'historic-moments',
    name: 'Historic Moments',
    description: 'Retell the iconic moments that defined the game.',
    category: 'History',
    icon: '🕰️',
    gradient: 'from-stone-400 to-amber-600',
    accentColor: '#d97706',
    sceneCount: 6,
    promptTemplate:
      'Create a nostalgic short retelling the historic football moment of {{topic}}. Set the scene, the drama, and why it still matters.',
  },
  {
    key: 'quiz-videos',
    name: 'Quiz Videos',
    description: 'Interactive quizzes that boost watch time and comments.',
    category: 'Interactive',
    icon: '❓',
    gradient: 'from-cyan-500 to-emerald-500',
    accentColor: '#06b6d4',
    sceneCount: 7,
    promptTemplate:
      'Create a football quiz short about {{topic}}. Ask 5 escalating questions and reveal each answer with a beat of suspense.',
  },
  {
    key: 'football-rankings',
    name: 'Football Rankings',
    description: 'Data-style rankings of clubs, leagues and legends.',
    category: 'Rankings',
    icon: '📈',
    gradient: 'from-fuchsia-500 to-purple-600',
    accentColor: '#d946ef',
    sceneCount: 7,
    promptTemplate:
      'Create a rankings short about {{topic}}. Present a clear ranked list with a one-line reason for each entry.',
  },
];
