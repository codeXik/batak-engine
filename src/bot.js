import { SUITS, suitOf, rankOf, makeDeck, shuffle } from './cards.js';
import { trickWinner } from './rules.js';
import { scoreRound } from './scoring.js';
import { BatakHand } from './hand.js';

// Computer player. It only looks at its own cards and at what is public (played cards, the table, the bid).
// Levels: 'kolay' (sloppy), 'normal' (rules of thumb) and 'zor' (counts cards, reads the bidder's hand,
// then plays out many possible worlds and picks the best card / bid).

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const lowest = (cards) => cards.reduce((a, b) => (rankOf(b) < rankOf(a) ? b : a));
const highest = (cards) => cards.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));

// Rough number of tricks `hand` should win with `trump` as trump.
export function estimateTricks(hand, trump) {
  const bySuit = (s) => hand.filter((c) => suitOf(c) === s).map(rankOf);
  const trumps = bySuit(trump);
  const tl = trumps.length;
  let total = 0;
  if (trumps.includes(14)) total += 1;
  if (trumps.includes(13)) total += tl >= 2 ? 0.95 : 0.4;
  if (trumps.includes(12)) total += tl >= 3 ? 0.85 : 0.3;
  if (trumps.includes(11)) total += tl >= 4 ? 0.7 : 0.2;
  if (trumps.includes(10)) total += tl >= 5 ? 0.6 : 0;
  total += Math.max(0, tl - 3) * 0.55;
  for (const s of SUITS) {
    if (s === trump) continue;
    const r = bySuit(s);
    if (r.includes(14)) total += 0.95;
    if (r.includes(13)) total += r.length >= 2 ? (r.includes(14) ? 0.9 : 0.55) : 0.15;
    if (r.includes(12)) total += r.length >= 3 && (r.includes(14) || r.includes(13)) ? 0.5 : 0.1;
    if (tl >= 2 && r.length === 0) total += 1;
    else if (tl >= 3 && r.length === 1) total += 0.5;
    else if (tl >= 4 && r.length === 2) total += 0.25;
  }
  return total;
}

export function bestTrump(hand) {
  let best = SUITS[0];
  let bestEst = -1;
  for (const s of SUITS) {
    const e = estimateTricks(hand, s);
    if (e > bestEst) { bestEst = e; best = s; }
  }
  return { suit: best, estimate: bestEst };
}

// How likely a hand is to take a trick: high cards count, an uneven hand (long or short suits) is worse.
function danger(hand) {
  let d = 0;
  for (const c of hand) d += { 14: 4, 13: 2.5, 12: 1.5, 11: 0.8, 10: 0.4 }[rankOf(c)] || 0;
  const lens = SUITS.map((s) => hand.filter((c) => suitOf(c) === s).length);
  return { points: d, shape: Math.max(...lens) - Math.min(...lens) };
}

export function botBid(h, seat, { level = 'normal', rng = Math.random, thinkMs = 300 } = {}) {
  if (level === 'zor') return zorBid(h, seat, { rng, thinkMs });
  const all = h.bidOptions(seat);
  const { estimate } = bestTrump(h.hands[seat]);
  if (level !== 'kolay') {
    if (all.includes('king') && estimate >= 12.5) return 'king';
    const d = danger(h.hands[seat]);
    if (all.includes('elalmaz') && h.highBidder >= 0 && d.points < 2 && d.shape <= 2) return 'elalmaz';
  }
  const n = Math.floor(estimate + 0.5) - (level === 'kolay' ? 1 : 0);
  const options = all.filter((o) => typeof o === 'number');
  const next = options[0];
  return next !== undefined && n >= next ? next : 'pass';
}

export function botTrump(h, seat) {
  return bestTrump(h.hands[seat]).suit;
}

export function botCard(h, seat, { level = 'normal', rng = Math.random, thinkMs = 500 } = {}) {
  const legal = h.legalCards(seat);
  if (legal.length === 1) return legal[0];
  if (level === 'zor') return zorCard(h, seat, { rng, thinkMs });
  if (level === 'kolay' && rng() < 0.4) return pick(legal, rng);

  const mine = new Set(h.hands[seat]);
  const played = new Set(h.played);
  const unseen = makeDeck().filter((c) => !mine.has(c) && !played.has(c));
  const isMaster = (c) => !unseen.some((u) => suitOf(u) === suitOf(c) && rankOf(u) > rankOf(c));

  const table = h.trick.map((t) => t.card);
  const wins = (c) => trickWinner([...table, c], h.trump) === table.length;
  const nonTrump = (list) => list.filter((c) => suitOf(c) !== h.trump);
  const cleanElAlmaz = (s) => h.elAlmaz.includes(s) && h.tricks[s] === 0;

  // El almaz still clean: lose every trick, getting rid of the highest card that safely loses
  if (cleanElAlmaz(seat)) {
    if (table.length === 0) return lowest(legal);
    const losers = legal.filter((c) => !wins(c));
    return losers.length ? highest(losers) : lowest(legal);
  }

  const done = h.tricks.reduce((a, b) => a + b, 0);
  const bidderNeeds = Math.max(0, h.bid - h.tricks[h.bidder]);
  const isBidder = seat === h.bidder;
  const passerNeeds = !isBidder && !h.elAlmaz.includes(seat) && h.tricks[seat] < h.settings.passerMinTricks;
  // a bidder always wants more tricks; the others want one for themselves or to break the bidder
  let wantWin = isBidder || passerNeeds || (bidderNeeds > 0 && 13 - done >= bidderNeeds);
  // a clean El almaz player winning this trick: leave it to them, it breaks their El almaz
  if (table.length > 0 && cleanElAlmaz(h.trick[trickWinner(table, h.trump)].seat)) wantWin = false;

  if (table.length === 0) {
    const masters = legal.filter(isMaster);
    if (wantWin && masters.length) {
      const plain = nonTrump(masters);
      if (plain.length) return pick(plain, rng);
      if (isBidder) return pick(masters, rng); // draw trumps
    }
    const plain = nonTrump(legal);
    return lowest(plain.length ? plain : legal);
  }

  const winners = legal.filter(wins);
  if (wantWin && winners.length) return lowest(winners);
  const losers = legal.filter((c) => !winners.includes(c));
  const pool = losers.length ? losers : legal;
  const plain = nonTrump(pool);
  return lowest(plain.length ? plain : pool);
}

// Does whatever the seat on turn has to do. Returns false when nothing is expected from a computer.
export function botStep(h, { level = 'normal', rng = Math.random, thinkMs } = {}) {
  const seat = h.turn;
  if (h.phase === 'bidding') h.placeBid(seat, botBid(h, seat, { level, rng, thinkMs }));
  else if (h.phase === 'trump') h.chooseTrump(seat, botTrump(h, seat));
  else if (h.phase === 'play') h.playCard(seat, botCard(h, seat, { level, rng, thinkMs }));
  else return false;
  return true;
}

// ---- 'zor' level -------------------------------------------------------------------------------------

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// One possible deal of the cards this seat cannot see: card counts are exact, suits a seat showed it
// lacks are respected, and the bidder is made to hold a hand worth about the bid in the chosen trump.
function sampleWorld(h, seat, rng) {
  const mine = new Set(h.hands[seat]);
  const played = new Set(h.played);
  const unseen = makeDeck().filter((c) => !mine.has(c) && !played.has(c));
  const others = [0, 1, 2, 3].filter((s) => s !== seat).sort((a, b) => h.voids[b].size - h.voids[a].size);
  let hands;
  for (let attempt = 0; attempt < 40; attempt++) {
    let pool = shuffle(unseen, rng);
    hands = [];
    hands[seat] = h.hands[seat].slice();
    let strict = true;
    for (const s of others) {
      const need = h.hands[s].length;
      const take = [];
      for (const c of pool) {
        if (take.length === need) break;
        if (!h.voids[s].has(suitOf(c))) take.push(c);
      }
      if (take.length < need) {
        strict = false;
        for (const c of pool) if (take.length < need && !take.includes(c)) take.push(c);
      }
      pool = pool.filter((c) => !take.includes(c));
      hands[s] = take;
    }
    if (!strict) continue;
    if (h.bidder < 0 || h.bidder === seat) return hands;
    const original = hands[h.bidder].concat(h.plays[h.bidder]);
    if (estimateTricks(original, h.trump) >= h.bid - 1.2) return hands;
  }
  return hands;
}

function rollout(c, rng) {
  while (c.phase === 'play') c.playCard(c.turn, botCard(c, c.turn, { level: 'normal', rng }));
  return c.scores;
}

export function zorCard(h, seat, { rng = Math.random, thinkMs = 500 } = {}) {
  const legal = h.legalCards(seat);
  if (legal.length === 1) return legal[0];
  const sums = legal.map(() => 0);
  const start = now();
  let worlds = 0;
  do {
    const hands = sampleWorld(h, seat, rng);
    legal.forEach((card, i) => {
      const c = h.clone(hands.map((x) => x.slice()));
      c.playCard(seat, card);
      sums[i] += rollout(c, rng)[seat];
    });
    worlds++;
  } while (worlds < 300 && (worlds < 4 || now() - start < thinkMs));
  let best = 0;
  for (let i = 1; i < legal.length; i++) {
    if (sums[i] > sums[best] || (sums[i] === sums[best] && rankOf(legal[i]) < rankOf(legal[best]))) best = i;
  }
  return legal[best];
}

// Random hands for the three other seats.
function dealOthers(mine, seat, rng) {
  const pool = shuffle(makeDeck().filter((c) => !mine.includes(c)), rng);
  const hands = [];
  let k = 0;
  for (let s = 0; s < 4; s++) hands[s] = s === seat ? mine.slice() : pool.slice(13 * k++, 13 * k);
  return hands;
}

// Chance of keeping El almaz against the bid on the table, played out over random deals.
function elAlmazChance(h, seat, rng, thinkMs) {
  const start = now();
  let worlds = 0;
  let kept = 0;
  do {
    const hands = dealOthers(h.hands[seat], seat, rng);
    const { suit, estimate } = bestTrump(hands[h.highBidder]);
    const bid = Math.min(13, Math.max(h.highBid, Math.round(estimate)));
    const c = BatakHand.playing({ dealer: h.dealer, hands, bidder: h.highBidder, bid, trump: suit, settings: h.settings });
    c.elAlmaz = [seat];
    rollout(c, rng);
    if (c.tricks[seat] === 0) kept++;
    worlds++;
  } while (worlds < 300 && (worlds < 20 || now() - start < thinkMs));
  return kept / worlds;
}

const PASS_VALUE = 2; // rough average of staying out of a bid

export function zorBid(h, seat, { rng = Math.random, thinkMs = 300 } = {}) {
  const all = h.bidOptions(seat);
  const options = all.filter((o) => typeof o === 'number');
  const mine = h.hands[seat];
  const { suit, estimate } = bestTrump(mine);
  let bestBid = 'pass';
  let bestValue = PASS_VALUE;
  if (options.length && estimate >= h.settings.minBid - 2.5) {
    const target = Math.min(13, Math.max(h.settings.minBid, Math.round(estimate)));
    const results = [];
    const start = now();
    let worlds = 0;
    do {
      const hands = dealOthers(mine, seat, rng);
      const c = BatakHand.playing({ dealer: h.dealer, hands, bidder: seat, bid: target, trump: suit, settings: h.settings });
      rollout(c, rng);
      results.push(c.tricks[seat]);
      worlds++;
    } while (worlds < 400 && (worlds < 20 || now() - start < thinkMs));
    // a King that comes off wins the whole game
    if (all.includes('king') && results.filter((t) => t === 13).length / results.length >= 0.5) return 'king';
    for (const b of options) {
      let sum = 0;
      for (const t of results) sum += scoreRound({ bidder: 0, bid: b, tricks: [t, 0, 0, 0] }, h.settings)[0];
      const value = sum / results.length;
      if (value > bestValue) { bestValue = value; bestBid = b; }
    }
  }
  // El almaz only against a real bid (if everybody passed, the first speaker would be stuck with the bid)
  if (all.includes('elalmaz') && h.highBidder >= 0 && danger(mine).points < 5) {
    const p = elAlmazChance(h, seat, rng, thinkMs);
    const value = h.settings.elAlmazPoints * (2 * p - 1);
    if (value > bestValue) return 'elalmaz';
  }
  return bestBid;
}
