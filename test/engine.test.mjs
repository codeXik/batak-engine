import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, dealHands, isBadHand } from '../src/cards.js';
import { legalCards, trickWinner } from '../src/rules.js';
import { scoreRound } from '../src/scoring.js';
import { BatakHand } from '../src/hand.js';
import { withDefaults } from '../src/settings.js';
import { BatakMatch } from '../src/match.js';

const S = withDefaults();
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sorted = (a) => a.slice().sort();

test('deal: 4 hands of 13, all 52 cards once', () => {
  const { hands } = dealHands(seeded(1));
  assert.deepEqual(hands.map((h) => h.length), [13, 13, 13, 13]);
  assert.deepEqual(sorted(hands.flat()), sorted(makeDeck()));
});

test('bad hand: no ace or face card; redeal is off by default and capped when on', () => {
  assert.equal(isBadHand(['S2', 'H10', 'D9']), true);
  assert.equal(isBadHand(['S2', 'H11']), false);
  let bad = 0;
  for (let i = 1; i <= 200; i++) if (dealHands(seeded(i)).hands.some(isBadHand)) bad++;
  assert.ok(bad > 0, 'sample should contain bad hands');
  assert.equal(dealHands(seeded(1)).redeals, 0);
  const capped = dealHands(() => 0.5, { redealBadHand: true, maxRedeals: 2 });
  assert.ok(capped.redeals <= 2);
});

test('follow suit; must beat the led suit when possible', () => {
  const hand = ['H3', 'H14', 'S14'];
  assert.deepEqual(sorted(legalCards(hand, ['H8'], 'S', true, S)), ['H14']);
  assert.deepEqual(sorted(legalCards(hand, ['H8'], 'S', true, { ...S, mustOvertake: false })), ['H14', 'H3']);
  assert.deepEqual(sorted(legalCards(['H3', 'H5'], ['H8'], 'S', true, S)), ['H3', 'H5']);
});

test('void in led suit: must trump, and must overtrump when trump is on the table', () => {
  assert.deepEqual(sorted(legalCards(['S4', 'H14'], ['D14'], 'S', true, S)), ['S4']);
  assert.deepEqual(sorted(legalCards(['S4', 'S9', 'H14'], ['D14', 'S8'], 'S', true, S)), ['S9']);
  assert.deepEqual(sorted(legalCards(['S4', 'S5', 'H14'], ['D14', 'S8'], 'S', true, S)), ['S4', 'S5']);
  assert.deepEqual(sorted(legalCards(['C4', 'H14'], ['D14'], 'S', true, S)), ['C4', 'H14']);
});

test('a player who follows suit need not overtrump a cut', () => {
  assert.deepEqual(sorted(legalCards(['D3', 'D4'], ['D8', 'S2'], 'S', true, S)), ['D3', 'D4']);
});

test('trump cannot be led before it is broken, except only-trumps or an A-K-Q sequence', () => {
  assert.deepEqual(sorted(legalCards(['S14', 'H3'], [], 'S', false, S)), ['H3']);
  assert.deepEqual(sorted(legalCards(['S14', 'S13'], [], 'S', false, S)), ['S13', 'S14']);
  assert.deepEqual(sorted(legalCards(['S14', 'S13', 'S12', 'S2', 'H3'], [], 'S', false, S)), ['H3', 'S12', 'S13', 'S14']);
  assert.deepEqual(sorted(legalCards(['S14', 'H3'], [], 'S', true, S)), ['H3', 'S14']);
});

test('trick winner: highest trump, else highest of the led suit', () => {
  assert.equal(trickWinner(['H8', 'H12', 'D14', 'H3'], 'S'), 1);
  assert.equal(trickWinner(['H8', 'S2', 'D14', 'S3'], 'S'), 3);
  assert.equal(trickWinner(['H8', 'C14', 'D14', 'H9'], 'S'), 3);
});

test('scoring x10: made, missed, passer rules', () => {
  const r = scoreRound({ bidder: 0, bid: 7, tricks: [8, 3, 2, 0] }, S);
  assert.deepEqual(r, [71, 3, 2, -7]);
  assert.deepEqual(scoreRound({ bidder: 0, bid: 7, tricks: [6, 4, 3, 0] }, S), [-70, 4, 3, -7]);
  assert.deepEqual(scoreRound({ bidder: 0, bid: 7, tricks: [10, 1, 1, 1] }, { ...S, threeOverBusts: true }), [-70, 1, 1, 1]);
  assert.deepEqual(scoreRound({ bidder: 0, bid: 7, tricks: [8, 3, 2, 0] }, { ...S, scoring: 'classic', passerMinTricks: 0 }), [8, 3, 2, 0]);
});

test('bidding: floor, raising, pass is final, order starts at the dealer\'s right', () => {
  const h = new BatakHand({ dealer: 0, rng: seeded(7) });
  assert.equal(h.turn, 1);
  assert.throws(() => h.placeBid(2, 5), /turn/);
  assert.throws(() => h.placeBid(1, 4), /Illegal/);
  h.placeBid(1, 5);
  assert.throws(() => h.placeBid(2, 5), /Illegal/);
  h.placeBid(2, 'pass');
  h.placeBid(3, 6);
  h.placeBid(0, 'pass');
  assert.equal(h.turn, 1);
  h.placeBid(1, 'pass');
  assert.equal(h.phase, 'trump');
  assert.equal(h.bidder, 3);
  assert.equal(h.bid, 6);
  assert.throws(() => h.chooseTrump(1, 'S'), /bidder/);
  h.chooseTrump(3, 'H');
  assert.equal(h.phase, 'play');
  assert.equal(h.turn, 3);
});

test('everybody passes: the first bidder gets 4 and chooses trump', () => {
  const h = new BatakHand({ dealer: 2, rng: seeded(3) });
  for (const s of [3, 0, 1, 2]) h.placeBid(s, 'pass');
  assert.equal(h.phase, 'trump');
  assert.equal(h.bidder, 3);
  assert.equal(h.bid, 4);
});

test('illegal plays are refused and do not change the state', () => {
  const h = new BatakHand({ dealer: 0, rng: seeded(11) });
  h.placeBid(1, 'pass'); h.placeBid(2, 'pass'); h.placeBid(3, 'pass'); h.placeBid(0, 5);
  h.chooseTrump(0, 'S');
  const hand = h.hands[0].slice();
  assert.throws(() => h.playCard(1, h.hands[1][0]), /turn/);
  const foreign = h.hands[1][0];
  assert.throws(() => h.playCard(0, foreign), /hold/);
  const illegal = hand.find((c) => !h.legalCards(0).includes(c));
  if (illegal) assert.throws(() => h.playCard(0, illegal), /Illegal/);
  assert.deepEqual(h.hands[0], hand);
});

test('whole random games: legal moves always exist, 13 tricks, 52 cards, scores match', () => {
  for (let g = 1; g <= 300; g++) {
    const rng = seeded(g);
    const settings = { redealBadHand: g % 3 === 0, threeOverBusts: g % 5 === 0, scoring: g % 7 === 0 ? 'classic' : 'x10' };
    const h = new BatakHand({ dealer: g % 4, rng, settings });
    assert.deepEqual(h.hands.map((x) => x.length), [13, 13, 13, 13]);
    while (h.phase === 'bidding') {
      const opts = h.bidOptions();
      h.placeBid(h.turn, opts[Math.floor(rng() * opts.length)]);
    }
    h.chooseTrump(h.bidder, 'SHDC'[Math.floor(rng() * 4)]);
    const seen = new Set();
    while (h.phase === 'play') {
      const legal = h.legalCards();
      assert.ok(legal.length > 0, 'a legal card must always exist');
      const card = legal[Math.floor(rng() * legal.length)];
      assert.ok(!seen.has(card), 'a card is never played twice');
      seen.add(card);
      h.playCard(h.turn, card);
    }
    assert.equal(h.phase, 'done');
    assert.equal(seen.size, 52);
    assert.equal(h.tricks.reduce((a, b) => a + b), 13);
    assert.ok(h.hands.every((x) => x.length === 0));
    assert.deepEqual(h.scores, scoreRound({ bidder: h.bidder, bid: h.bid, tricks: h.tricks }, h.settings));
  }
});

test('bot: finishes whole games legally, only ever bids what it can, and beats random play', async () => {
  const { botStep, botBid, botCard } = await import('../src/bot.js');
  const total = [0, 0, 0, 0];
  const N = 400;
  for (let g = 1; g <= N; g++) {
    const rng = seeded(1000 + g);
    const h = new BatakHand({ dealer: g % 4, rng });
    while (h.phase !== 'done') {
      if (h.turn === 0) {
        assert.ok(botStep(h, { level: g % 2 ? 'normal' : 'kolay', rng }));
      } else if (h.phase === 'bidding') {
        h.placeBid(h.turn, 'pass');
      } else if (h.phase === 'trump') {
        h.chooseTrump(h.turn, 'S');
      } else {
        const legal = h.legalCards();
        h.playCard(h.turn, legal[Math.floor(rng() * legal.length)]);
      }
    }
    h.scores.forEach((x, i) => (total[i] += x));
  }
  assert.ok(total[0] / N > Math.max(total[1], total[2], total[3]) / N, 'bot should out-score random players');
  const h = new BatakHand({ dealer: 0, rng: seeded(5) });
  assert.ok(h.bidOptions(h.turn).includes(botBid(h, h.turn)));
  h.placeBid(1, 'pass'); h.placeBid(2, 'pass'); h.placeBid(3, 'pass'); h.placeBid(0, 5);
  h.chooseTrump(0, 'S');
  assert.ok(h.legalCards(0).includes(botCard(h, 0)));
});

test('bot zor: tracks voids, plays whole games legally with a tiny think time', async () => {
  const { botStep } = await import('../src/bot.js');
  for (let g = 1; g <= 6; g++) {
    const rng = seeded(2000 + g);
    const h = new BatakHand({ dealer: g % 4, rng });
    while (h.phase !== 'done') botStep(h, { level: h.turn % 2 === 0 ? 'zor' : 'normal', rng, thinkMs: 5 });
    assert.equal(h.tricks.reduce((a, b) => a + b), 13);
    assert.deepEqual(h.plays.map((p) => p.length), [13, 13, 13, 13]);
  }
  const h = new BatakHand({ dealer: 0, hands: [['H5', 'C2'], ['H9', 'S3'], ['D4', 'D5'], ['C9', 'C8']] });
  Object.assign(h, { phase: 'play', bidder: 0, bid: 5, trump: 'S', turn: 0 });
  h.playCard(0, 'H5'); h.playCard(1, 'H9'); h.playCard(2, 'D4');
  assert.ok(h.voids[2].has('H') && !h.voids[1].has('H'));
  const c = h.clone();
  c.playCard(3, 'C9');
  assert.equal(h.trick.length, 3);
  assert.equal(c.tricks.reduce((a, b) => a + b), 1);
});

test('El almaz: counts as a pass, +50 when kept, -50 when broken, off by default', () => {
  const off = new BatakHand({ dealer: 0, rng: seeded(21) });
  assert.ok(!off.bidOptions(1).includes('elalmaz'));
  assert.throws(() => off.placeBid(1, 'elalmaz'), /switched off/);
  const h = new BatakHand({ dealer: 0, rng: seeded(21), settings: { elAlmaz: true } });
  assert.ok(h.bidOptions(1).includes('elalmaz'));
  h.placeBid(1, 'elalmaz');
  h.placeBid(2, 5);
  h.placeBid(3, 'pass');
  h.placeBid(0, 'pass');
  assert.equal(h.phase, 'trump');
  assert.equal(h.bidder, 2);
  assert.deepEqual(h.elAlmaz, [1]);
  const s = { ...S, elAlmaz: true };
  assert.deepEqual(scoreRound({ bidder: 2, bid: 5, tricks: [3, 0, 7, 3], elAlmaz: [1] }, s), [3, 50, 52, 3]);
  assert.deepEqual(scoreRound({ bidder: 2, bid: 5, tricks: [3, 1, 6, 3], elAlmaz: [1] }, s), [3, -50, 51, 3]);
});

test('El almaz: if everybody passes, the forced bidder is no longer El almaz', () => {
  const h = new BatakHand({ dealer: 0, rng: seeded(22), settings: { elAlmaz: true } });
  h.placeBid(1, 'elalmaz'); h.placeBid(2, 'pass'); h.placeBid(3, 'pass'); h.placeBid(0, 'pass');
  assert.equal(h.bidder, 1);
  assert.equal(h.bid, 4);
  assert.deepEqual(h.elAlmaz, []);
});

test('King: bid 13, only when on, ends the auction; made only with all 13 tricks', () => {
  const off = new BatakHand({ dealer: 0, rng: seeded(31) });
  assert.throws(() => off.placeBid(1, 'king'), /not possible/);
  const h = new BatakHand({ dealer: 0, rng: seeded(31), settings: { king: true } });
  assert.ok(h.bidOptions(1).includes('king'));
  h.placeBid(1, 7);
  h.placeBid(2, 'king');
  assert.equal(h.phase, 'trump');
  assert.equal(h.bidder, 2);
  assert.equal(h.bid, 13);
  assert.equal(h.king, true);
  assert.deepEqual(scoreRound({ bidder: 2, bid: 13, tricks: [0, 0, 13, 0] }, S), [-13, -13, 130, -13]);
});

test('match: rounds until the target, dealer rotates, a tie at the top plays on, King wins at once', () => {
  const match = new BatakMatch({ rng: seeded(41), settings: { targetScore: 51 } });
  const fakeRound = (scores, king = false) => {
    const h = match.startRound();
    Object.assign(h, { phase: 'done', scores, bidder: 0, bid: 5, tricks: [5, 3, 3, 2], kingMade: king });
    return match.finishRound();
  };
  assert.equal(match.dealer, 0);
  assert.equal(fakeRound([20, 5, 3, 1]).over, false);
  assert.equal(match.dealer, 1);
  assert.equal(fakeRound([20, 5, 3, 1]).over, false);
  const tie = fakeRound([20, 50, 0, 0]);
  assert.equal(tie.over, false, 'two seats tied on 60 at the top play on');
  const end = fakeRound([5, 0, 0, 0]);
  assert.deepEqual([end.over, end.winner], [true, 0]);
  assert.throws(() => match.startRound(), /over/);
  const m2 = new BatakMatch({ rng: seeded(42), settings: { king: true } });
  const h2 = m2.startRound();
  Object.assign(h2, { phase: 'done', scores: [-13, 130, -13, -13], bidder: 1, bid: 13, tricks: [0, 13, 0, 0], kingMade: true });
  assert.deepEqual(m2.finishRound().winner, 1);
});

test('match: whole matches of bots (including El almaz and King on) finish', async () => {
  const { botStep } = await import('../src/bot.js');
  for (let g = 1; g <= 5; g++) {
    const rng = seeded(3000 + g);
    const match = new BatakMatch({ rng, settings: { elAlmaz: g % 2 === 0, king: true, redealBadHand: true } });
    let rounds = 0;
    while (!match.over && rounds++ < 100) {
      const h = match.startRound();
      while (h.phase !== 'done') botStep(h, { level: g % 3 ? 'normal' : 'kolay', rng });
      match.finishRound();
    }
    assert.ok(match.over, 'match must end');
    assert.ok(match.scores[match.winner] === Math.max(...match.scores) || match.rounds.at(-1).king);
  }
});
