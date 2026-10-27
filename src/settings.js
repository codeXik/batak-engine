// Every rule that differs between tables is a setting; these are the agreed defaults (docs/KURALLAR.md).
export const DEFAULT_SETTINGS = {
  variant: 'ihaleli', // 'ihaleli' (bidding batak) or 'kozmaca' (spades always trump, no bidding, one point per trick)
  minBid: 5,
  allPassBid: 4, // everybody passes: the first bidder gets this bid
  mustOvertake: true, // must beat the best card of the led suit when possible
  mustOvertrump: true, // must beat the best trump on the table when possible
  scoring: 'x10', // 'x10' or 'classic'
  multiplier: 10, // x10 scoring
  passerMinTricks: 1, // players who did not win the bid must take at least this many (0 = off)
  passerPenalty: 1, // failed passer loses bid * passerPenalty
  threeOverBusts: false, // bidder who takes bid + 3 or more also fails
  redealBadHand: false,
  maxRedeals: 3,
  targetScore: 51, // a match ends when somebody reaches this
  elAlmaz: false, // a player may declare no tricks instead of bidding
  elAlmazPoints: 50, // plus when kept, minus when broken
  king: false, // a bidder may declare all 13 tricks (bid 13): made = wins the match
};

const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const CHECKS = {
  variant: (x) => x === 'ihaleli' || x === 'kozmaca',
  minBid: (x) => isInt(x, 1, 13),
  allPassBid: (x) => isInt(x, 1, 13),
  mustOvertake: (x) => typeof x === 'boolean',
  mustOvertrump: (x) => typeof x === 'boolean',
  scoring: (x) => x === 'x10' || x === 'classic',
  multiplier: (x) => isInt(x, 1, 1000),
  passerMinTricks: (x) => isInt(x, 0, 13),
  passerPenalty: (x) => isInt(x, 0, 1000),
  threeOverBusts: (x) => typeof x === 'boolean',
  redealBadHand: (x) => typeof x === 'boolean',
  maxRedeals: (x) => isInt(x, 0, 100),
  targetScore: (x) => isInt(x, 1, 100000),
  elAlmaz: (x) => typeof x === 'boolean',
  elAlmazPoints: (x) => isInt(x, 0, 100000),
  king: (x) => typeof x === 'boolean',
};

// Fills in the defaults and throws on an unknown setting or a value out of range.
export function withDefaults(settings = {}) {
  const out = { ...DEFAULT_SETTINGS, ...settings };
  for (const [key, value] of Object.entries(out)) {
    if (!CHECKS[key]) throw new Error(`Unknown setting: ${key}`);
    if (!CHECKS[key](value)) throw new Error(`Bad value for setting ${key}: ${value}`);
  }
  return out;
}
