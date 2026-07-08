/**
 * Curated, royalty-free football knowledge used to ground AI generation and to
 * power a deterministic offline fallback. No paid APIs required. This can later
 * be swapped for a live data provider behind the same shape.
 */

export interface PlayerFact {
  name: string;
  club: string;
  country: string;
  position: string;
  rating: number;
  fact: string;
}

export const TOP_PLAYERS: PlayerFact[] = [
  { name: 'Lionel Messi', club: 'Inter Miami', country: 'Argentina', position: 'RW', rating: 93, fact: 'Won a record 8 Ballon d’Or awards.' },
  { name: 'Cristiano Ronaldo', club: 'Al Nassr', country: 'Portugal', position: 'ST', rating: 91, fact: 'All-time leading scorer in men’s international football.' },
  { name: 'Kylian Mbappé', club: 'Real Madrid', country: 'France', position: 'ST', rating: 92, fact: 'Scored a hat-trick in a World Cup final.' },
  { name: 'Erling Haaland', club: 'Manchester City', country: 'Norway', position: 'ST', rating: 92, fact: 'Broke the Premier League single-season scoring record with 36 goals.' },
  { name: 'Jude Bellingham', club: 'Real Madrid', country: 'England', position: 'CM', rating: 90, fact: 'Became a Galáctico before turning 21.' },
  { name: 'Vinícius Júnior', club: 'Real Madrid', country: 'Brazil', position: 'LW', rating: 90, fact: 'Scored in a Champions League final.' },
  { name: 'Kevin De Bruyne', club: 'Manchester City', country: 'Belgium', position: 'CM', rating: 90, fact: 'One of the most prolific assist-makers of his generation.' },
  { name: 'Rodri', club: 'Manchester City', country: 'Spain', position: 'CDM', rating: 91, fact: 'Won the Ballon d’Or as a defensive midfielder.' },
  { name: 'Harry Kane', club: 'Bayern Munich', country: 'England', position: 'ST', rating: 90, fact: 'England’s all-time top scorer.' },
  { name: 'Mohamed Salah', club: 'Liverpool', country: 'Egypt', position: 'RW', rating: 89, fact: 'Shared a Premier League Golden Boot record in a single season.' },
  { name: 'Lamine Yamal', club: 'Barcelona', country: 'Spain', position: 'RW', rating: 87, fact: 'Youngest player and scorer in European Championship history.' },
  { name: 'Florian Wirtz', club: 'Liverpool', country: 'Germany', position: 'AM', rating: 88, fact: 'Orchestrated an unbeaten Bundesliga title run.' },
];

export interface ClubFact {
  name: string;
  country: string;
  league: string;
  titles: number;
  fact: string;
}

export const TOP_CLUBS: ClubFact[] = [
  { name: 'Real Madrid', country: 'Spain', league: 'La Liga', titles: 15, fact: 'Record 15-time European champions.' },
  { name: 'Barcelona', country: 'Spain', league: 'La Liga', titles: 5, fact: 'Famous for the tiki-taka style and La Masia academy.' },
  { name: 'Manchester City', country: 'England', league: 'Premier League', titles: 1, fact: 'Completed a historic continental treble in 2023.' },
  { name: 'Bayern Munich', country: 'Germany', league: 'Bundesliga', titles: 6, fact: 'Won 11 consecutive Bundesliga titles.' },
  { name: 'Liverpool', country: 'England', league: 'Premier League', titles: 6, fact: 'Famous Anfield anthem: You’ll Never Walk Alone.' },
  { name: 'Manchester United', country: 'England', league: 'Premier League', titles: 3, fact: 'Won the treble in 1999 with a stoppage-time comeback.' },
  { name: 'AC Milan', country: 'Italy', league: 'Serie A', titles: 7, fact: 'Seven-time European champions.' },
  { name: 'Inter Milan', country: 'Italy', league: 'Serie A', titles: 3, fact: 'Won a treble under José Mourinho in 2010.' },
];

export const FOOTBALL_FACTS: string[] = [
  'The fastest goal in football history was scored in about 2 seconds.',
  'The 1950 Maracanã final drew a crowd estimated at nearly 200,000 people.',
  'A football match has two halves of 45 minutes, but stoppage time can add several minutes.',
  'The Champions League anthem is based on Handel’s “Zadok the Priest”.',
  'Goal-line technology was introduced to eliminate “ghost goal” controversies.',
  'The bicycle kick is one of the most iconic skills in the sport.',
  'Brazil is the only nation to have played in every men’s World Cup.',
  'The offside rule has existed in some form since the earliest football codes.',
  'A hat-trick is when a single player scores three goals in one match.',
  'The World Cup trophy is made of solid 18-carat gold.',
];

export const TACTICS: { name: string; detail: string }[] = [
  { name: 'Gegenpressing', detail: 'Win the ball back instantly after losing it, high up the pitch.' },
  { name: 'Tiki-taka', detail: 'Short passing and constant movement to dominate possession.' },
  { name: 'Low block', detail: 'Sit deep, stay compact, and hit on the counter.' },
  { name: 'Inverted full-backs', detail: 'Full-backs move into midfield to overload the centre.' },
  { name: 'False nine', detail: 'A striker drops deep to drag defenders and create space.' },
];

export interface Fixture {
  home: string;
  away: string;
  competition: string;
  prediction: string;
}

export const SAMPLE_FIXTURES: Fixture[] = [
  { home: 'Real Madrid', away: 'Barcelona', competition: 'La Liga', prediction: 'A tight El Clásico decided by fine margins.' },
  { home: 'Manchester City', away: 'Liverpool', competition: 'Premier League', prediction: 'End-to-end game with plenty of goals.' },
  { home: 'Bayern Munich', away: 'Borussia Dortmund', competition: 'Bundesliga', prediction: 'Der Klassiker intensity favours the hosts.' },
  { home: 'Inter Milan', away: 'AC Milan', competition: 'Serie A', prediction: 'The Derby della Madonnina could go either way.' },
];

export function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  // Keep the LCG state strictly non-negative so derived indices stay in range.
  let s = Math.abs(seed) % 233280 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
