// Cards are strings: suit letter + rank, e.g. 'S14' = ace of spades, 'H11' = jack of hearts.
export const SUITS = ['S', 'H', 'D', 'C']; // spades, hearts, diamonds, clubs
export const SUIT_NAMES_TR = { S: 'Maça', H: 'Kupa', D: 'Karo', C: 'Sinek' };

export const suitOf = (card) => card[0];
export const rankOf = (card) => Number(card.slice(1));
export const isCard = (card) => typeof card === 'string' && /^[SHDC](?:[2-9]|1[0-4])$/.test(card);

export function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push(s + r);
  return deck;
}

// Unpredictable random number in [0, 1) from the platform's cryptographic generator (browsers, Node.js 19+).
// Use it wherever a deal must not be guessable, e.g. on a game server.
export function secureRandom() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') throw new Error('No cryptographic random generator here');
  const [hi, lo] = c.getRandomValues(new Uint32Array(2));
  return ((hi >>> 5) * 67108864 + (lo >>> 6)) / 9007199254740992; // 53 random bits
}

// The default for dealing: secure when the platform has it.
export const defaultRandom = () => (globalThis.crypto?.getRandomValues ? secureRandom() : Math.random());

export function shuffle(deck, rng = defaultRandom) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A "bad hand" has no ace and no face card (K, Q, J).
export const isBadHand = (hand) => !hand.some((c) => rankOf(c) >= 11);

// Deals 13 cards to each of 4 seats. With redealBadHand on, a deal where any seat
// holds a bad hand is thrown away and dealt again, up to maxRedeals times in a row.
export function dealHands(rng = defaultRandom, settings = {}) {
  const { redealBadHand = false, maxRedeals = 3 } = settings;
  let redeals = 0;
  for (;;) {
    const deck = shuffle(makeDeck(), rng);
    const hands = [0, 1, 2, 3].map((i) => deck.slice(i * 13, i * 13 + 13));
    if (!redealBadHand || redeals >= maxRedeals || !hands.some(isBadHand)) return { hands, redeals };
    redeals++;
  }
}
