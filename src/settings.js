// Every rule that differs between tables is a setting; these are the agreed defaults (docs/KURALLAR.md).
export const DEFAULT_SETTINGS = {
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

export const withDefaults = (settings = {}) => ({ ...DEFAULT_SETTINGS, ...settings });
