import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDeck, dealHands, isBadHand } from '../src/cards.js';
import { legalCards, trickWinner } from '../src/rules.js';
import { scoreRound, scoreRoundTeams } from '../src/scoring.js';
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

test('bad settings and bad hands are refused', () => {
  assert.throws(() => new BatakHand({ settings: { minBid: 20 } }), /minBid/);
  assert.throws(() => new BatakHand({ settings: { scoring: 'x5' } }), /scoring/);
  assert.throws(() => new BatakHand({ settings: { kozz: true } }), /Unknown setting/);
  assert.throws(() => new BatakMatch({ settings: { targetScore: 0 } }), /targetScore/);
  assert.throws(() => new BatakHand({ hands: [['S2'], ['S2'], [], []] }), /twice/);
  assert.throws(() => new BatakHand({ hands: [['S1'], [], [], []] }), /Not a card/);
  assert.throws(() => new BatakHand({ hands: [[], [], []] }), /4 lists/);
  assert.throws(() => new BatakHand({ dealer: 4 }), /Dealer/);
});

test('auction log, finished tricks and the last trick are kept', () => {
  const h = new BatakHand({ dealer: 0, rng: seeded(51) });
  h.placeBid(1, 5); h.placeBid(2, 'pass'); h.placeBid(3, 6); h.placeBid(0, 'pass'); h.placeBid(1, 'pass');
  assert.deepEqual(h.auction.map((a) => a.bid), [5, 'pass', 6, 'pass', 'pass']);
  assert.deepEqual(h.auction.map((a) => a.seat), [1, 2, 3, 0, 1]);
  h.chooseTrump(3, 'S');
  assert.equal(h.lastTrick, null);
  while (h.phase === 'play') h.playCard(h.turn, h.legalCards()[0]);
  assert.equal(h.history.length, 13);
  assert.equal(h.history[0].leader, 3);
  assert.deepEqual(h.history.map((t) => t.winner).reduce((n, w) => (n[w]++, n), [0, 0, 0, 0]), h.tricks);
  for (let i = 1; i < 13; i++) assert.equal(h.history[i].leader, h.history[i - 1].winner);
  assert.deepEqual(h.lastTrick, h.history[12]);
});

test('save and load: a round and a match go on exactly as before', async () => {
  const { botStep } = await import('../src/bot.js');
  const a = new BatakHand({ dealer: 1, rng: seeded(61), settings: { elAlmaz: true } });
  const r1 = seeded(62);
  while (a.phase !== 'play' || a.played.length < 18) botStep(a, { rng: r1 });
  const b = BatakHand.fromJSON(JSON.parse(JSON.stringify(a)));
  assert.deepEqual(b.toJSON(), a.toJSON());
  const ra = seeded(63);
  const rb = seeded(63);
  while (a.phase !== 'done') { botStep(a, { rng: ra }); botStep(b, { rng: rb }); }
  assert.deepEqual(b.scores, a.scores);
  assert.deepEqual(b.history, a.history);
  assert.throws(() => BatakHand.fromJSON({ version: 99 }), /format/);
  const broken = JSON.parse(JSON.stringify(a));
  broken.plays[0][0] = broken.plays[1][0];
  assert.throws(() => BatakHand.fromJSON(broken), /twice/);
  for (const spoil of [(d) => { d.phase = 'x'; }, (d) => { d.tricks[0]++; }, (d) => { d.trump = null; }, (d) => { d.turn = 7; }]) {
    const d = JSON.parse(JSON.stringify(a));
    spoil(d);
    assert.throws(() => BatakHand.fromJSON(d), /inconsistent/);
  }

  const m = new BatakMatch({ rng: seeded(64), settings: { targetScore: 1000 } });
  for (let i = 0; i < 2; i++) {
    const h = m.startRound();
    while (h.phase !== 'done') botStep(h, { rng: r1 });
    m.finishRound();
  }
  const h = m.startRound();
  botStep(h, { rng: r1 });
  const m2 = BatakMatch.fromJSON(JSON.parse(JSON.stringify(m)), { rng: seeded(65) });
  assert.deepEqual(m2.toJSON(), m.toJSON());
  assert.throws(() => m2.startRound(), /not finished/);
  while (m2.hand.phase !== 'done') botStep(m2.hand, { rng: r1 });
  m2.finishRound();
  assert.equal(m2.rounds.length, 3);
  assert.deepEqual(m2.standings.map((x) => x.score), m2.scores.slice().sort((x, y) => y - x));
});

test('a seat view shows only its own cards; a clone keeps King', () => {
  const h = new BatakHand({ dealer: 0, rng: seeded(71) });
  const v = h.view(1);
  assert.deepEqual(v.hand, h.hands[1]);
  assert.deepEqual(v.handSizes, [13, 13, 13, 13]);
  assert.equal(v.hands, undefined);
  for (const c of h.hands[2]) assert.ok(!JSON.stringify(v).includes(`"${c}"`), 'another seat\'s card is hidden');
  assert.deepEqual(v.bidOptions, h.bidOptions(1));
  h.king = true; h.kingMade = true;
  assert.equal(h.clone().kingMade, true);
});

test('bot: an El almaz player ducks, declares El almaz with a hopeless hand, says King with all 13', async () => {
  const { botCard, botBid } = await import('../src/bot.js');
  const h = new BatakHand({ dealer: 0, hands: [['H10', 'C2'], ['H5', 'H9', 'C14'], ['D4', 'D5'], ['C9', 'C8']], settings: { elAlmaz: true } });
  Object.assign(h, { phase: 'play', bidder: 0, bid: 5, trump: 'S', turn: 0, elAlmaz: [1] });
  h.playCard(0, 'H10');
  assert.equal(botCard(h, 1), 'H9', 'keeps the clean El almaz: highest card that still loses');

  const weak = ['S2', 'S3', 'S4', 'H2', 'H3', 'H4', 'D2', 'D3', 'D4', 'C2', 'C3', 'C5', 'C6'];
  const rest = makeDeck().filter((c) => !weak.includes(c));
  const deal = [rest.slice(0, 13), weak, rest.slice(13, 26), rest.slice(26, 39)];
  const e = new BatakHand({ dealer: 3, hands: deal, settings: { elAlmaz: true } });
  e.placeBid(0, 5);
  assert.equal(botBid(e, 1), 'elalmaz');
  assert.equal(botBid(e, 1, { level: 'zor', rng: seeded(72), thinkMs: 5 }), 'elalmaz');

  const spades = makeDeck().filter((c) => c[0] === 'S');
  const others = makeDeck().filter((c) => c[0] !== 'S');
  const k = new BatakHand({ dealer: 0, hands: [others.slice(0, 13), spades, others.slice(13, 26), others.slice(26)], settings: { king: true } });
  assert.equal(botBid(k, 1), 'king');
  assert.equal(botBid(k, 1, { level: 'zor', rng: seeded(73), thinkMs: 5 }), 'king');
});

test('secure dealing: crypto numbers in [0, 1), default deals are unpredictable', async () => {
  const { secureRandom } = await import('../src/cards.js');
  for (let i = 0; i < 1000; i++) {
    const x = secureRandom();
    assert.ok(x >= 0 && x < 1);
  }
  const a = new BatakHand().hands.flat().join();
  const b = new BatakHand().hands.flat().join();
  assert.notEqual(a, b);
});

test('act: one entry point that never throws, with error codes and the action counter', async () => {
  const { botAction } = await import('../src/bot.js');
  const h = new BatakHand({ dealer: 0, rng: seeded(81), settings: { elAlmaz: true } });
  assert.equal(h.seq, 0);
  assert.deepEqual(h.act(9, { type: 'bid', value: 5 }), { ok: false, error: 'badAction' });
  assert.deepEqual(h.act(1, null), { ok: false, error: 'badAction' });
  assert.deepEqual(h.act(1, { type: 'jump' }), { ok: false, error: 'badAction' });
  assert.deepEqual(h.act(2, { type: 'bid', value: 5 }), { ok: false, error: 'notYourTurn' });
  assert.deepEqual(h.act(1, { type: 'card', value: h.hands[1][0] }), { ok: false, error: 'wrongPhase' });
  assert.deepEqual(h.act(1, { type: 'bid', value: 4 }), { ok: false, error: 'illegal' });
  assert.deepEqual(h.act(1, { type: 'bid', value: '5' }), { ok: false, error: 'illegal' });
  assert.equal(h.seq, 0, 'refused actions change nothing');
  assert.deepEqual(h.act(1, { type: 'bid', value: 5, seq: 0 }), { ok: true, seq: 1 });
  assert.deepEqual(h.lastAction, { seq: 1, seat: 1, type: 'bid', value: 5 });
  assert.deepEqual(h.act(2, { type: 'bid', value: 'pass', seq: 0 }), { ok: false, error: 'stale' }, 'a late message is refused');
  for (const s of [2, 3, 0]) assert.ok(h.act(s, { type: 'bid', value: 'pass' }).ok);
  assert.equal(h.expects(1), 'trump');
  assert.equal(h.expects(2), null);
  assert.deepEqual(h.act(1, { type: 'trump', value: 'X' }), { ok: false, error: 'illegal' });
  assert.ok(h.act(1, { type: 'trump', value: 'H' }).ok);
  let last;
  while (h.phase !== 'done') {
    const a = botAction(h);
    assert.equal(a.type, 'card');
    last = h.act(h.turn, a);
    assert.ok(last.ok);
    assert.deepEqual(h.act(h.turn, a), { ok: false, error: 'stale' }, 'the same message twice is refused');
  }
  assert.equal(last.trickDone, true);
  assert.equal(h.seq, 4 + 1 + 52);
  assert.equal(botAction(h), null);
  assert.deepEqual(h.act(0, { type: 'card', value: 'S2' }), { ok: false, error: 'gameOver' });

  const old = h.toJSON();
  delete old.seq;
  delete old.lastAction;
  assert.equal(BatakHand.fromJSON(old).seq, 57, 'saves without a counter still load');
});

test('match view: scores, standings and the round in progress, other hands hidden', () => {
  const m = new BatakMatch({ rng: seeded(91) });
  const h = m.startRound();
  const v = m.view(2);
  assert.equal(v.round, 1);
  assert.equal(v.over, false);
  assert.deepEqual(v.hand.hand, h.hands[2]);
  for (const c of h.hands[0]) assert.ok(!JSON.stringify(v).includes(`"${c}"`));
});

test('Koz Maça: no auction, spades are trump, one point per trick, the dealer\'s right leads', async () => {
  const { botStep } = await import('../src/bot.js');
  for (const level of ['kolay', 'normal', 'zor']) {
    for (let seed = 1; seed <= (level === 'zor' ? 3 : 15); seed++) {
      const h = new BatakHand({ dealer: seed % 4, rng: seeded(seed), settings: { variant: 'kozmaca' } });
      assert.equal(h.phase, 'play');
      assert.equal(h.trump, 'S');
      assert.equal(h.turn, (h.dealer + 1) % 4);
      assert.deepEqual(h.bidOptions(h.turn), []);
      assert.equal(h.act(h.turn, { type: 'bid', value: 5 }).error, 'wrongPhase');
      while (h.phase === 'play') botStep(h, { level, rng: seeded(seed + 7), thinkMs: 5 });
      assert.equal(h.phase, 'done');
      assert.deepEqual(h.scores, h.tricks);
      assert.equal(h.tricks.reduce((a, b) => a + b, 0), 13);
      assert.equal(h.kingMade, false);
    }
  }
});

test('Koz Maça: save and load in the middle of a round, and a whole match to the target', async () => {
  const { botStep } = await import('../src/bot.js');
  const h = new BatakHand({ dealer: 2, rng: seeded(5), settings: { variant: 'kozmaca' } });
  for (let i = 0; i < 9; i++) botStep(h, { level: 'normal', rng: seeded(i) });
  const copy = BatakHand.fromJSON(JSON.parse(JSON.stringify(h.toJSON())));
  assert.deepEqual(copy.toJSON(), h.toJSON());
  while (h.phase === 'play') { botStep(h, { rng: seeded(1) }); botStep(copy, { rng: seeded(1) }); }
  assert.deepEqual(copy.scores, h.scores);
  const m = new BatakMatch({ settings: { variant: 'kozmaca', targetScore: 20 }, rng: seeded(3) });
  let guard = 0;
  while (!m.over && guard++ < 40) {
    const hand = m.startRound();
    while (hand.phase === 'play') botStep(hand, { rng: seeded(guard) });
    m.finishRound();
  }
  assert.ok(m.over);
  assert.ok(Math.max(...m.scores) >= 20);
  assert.equal(m.rounds.length, m.scores.reduce((a, b) => a + b, 0) / 13);
  assert.throws(() => withDefaults({ variant: 'eşli' }));
});

test('Eşli Batak scoring: the team\'s tricks are added, both seats of a team share the score', () => {
  const classic = withDefaults({ variant: 'esli', scoring: 'classic' });
  // bidder 1 (team 1+3) bids 6 and the team takes 4 + 3 = 7: made, 7 points; the others took 6
  assert.deepEqual(scoreRoundTeams({ bidder: 1, bid: 6, tricks: [3, 4, 3, 3] }, classic), [6, 7, 6, 7]);
  // 2+... bidder 0 bids 7, team takes 3 + 2 = 5: broken (-7); the others took 8
  assert.deepEqual(scoreRoundTeams({ bidder: 0, bid: 7, tricks: [3, 4, 2, 4] }, classic), [-7, 8, -7, 8]);
  // the other team takes no trick at all: they lose the bid (the passer rule, for the team)
  assert.deepEqual(scoreRoundTeams({ bidder: 2, bid: 5, tricks: [7, 0, 6, 0] }, classic), [13, -5, 13, -5]);
  const x10 = withDefaults({ variant: 'esli', scoring: 'x10' });
  assert.deepEqual(scoreRoundTeams({ bidder: 0, bid: 6, tricks: [4, 2, 3, 4] }, x10), [61, 6, 61, 6]);
  assert.deepEqual(scoreRoundTeams({ bidder: 0, bid: 6, tricks: [2, 5, 2, 4] }, x10), [-60, 9, -60, 9]);
});

test('Eşli Batak: bots play whole rounds, no El almaz or King, team scores agree with the tricks', async () => {
  const { botStep } = await import('../src/bot.js');
  assert.throws(() => withDefaults({ variant: 'esli', king: true }));
  assert.throws(() => withDefaults({ variant: 'esli', elAlmaz: true }));
  for (const level of ['kolay', 'normal', 'zor']) {
    for (let seed = 1; seed <= (level === 'zor' ? 3 : 20); seed++) {
      const h = new BatakHand({ dealer: seed % 4, rng: seeded(seed), settings: { variant: 'esli', scoring: seed % 2 ? 'classic' : 'x10' } });
      while (h.phase !== 'done') {
        assert.ok(!h.bidOptions().includes('elalmaz') && !h.bidOptions().includes('king'));
        botStep(h, { level, rng: seeded(seed + 3), thinkMs: 5 });
      }
      assert.deepEqual(h.scores, scoreRoundTeams({ bidder: h.bidder, bid: h.bid, tricks: h.tricks }, h.settings));
      assert.equal(h.scores[0], h.scores[2]);
      assert.equal(h.scores[1], h.scores[3]);
      assert.equal(h.tricks.reduce((a, b) => a + b, 0), 13);
    }
  }
});

test('Eşli Batak: a bot never outbids its own partner; a whole match ends with a winning team; save and load', async () => {
  const { botStep, botBid } = await import('../src/bot.js');
  const h = new BatakHand({ dealer: 3, rng: seeded(11), settings: { variant: 'esli' } });
  h.placeBid(h.turn, 5); // the seat to speak first bids 5
  const partnerOfBidder = (h.highBidder + 2) % 4;
  while (h.turn !== partnerOfBidder) h.placeBid(h.turn, 'pass');
  for (const level of ['kolay', 'normal', 'zor']) assert.equal(botBid(h, partnerOfBidder, { level, thinkMs: 5 }), 'pass');
  const m = new BatakMatch({ settings: { variant: 'esli', targetScore: 25 }, rng: seeded(4) });
  let guard = 0;
  while (!m.over && guard++ < 60) {
    const hand = m.startRound();
    if (guard === 2) assert.deepEqual(BatakHand.fromJSON(JSON.parse(JSON.stringify(hand.toJSON()))).toJSON(), hand.toJSON());
    while (hand.phase !== 'done') botStep(hand, { rng: seeded(guard) });
    m.finishRound();
    assert.equal(m.scores[0], m.scores[2]);
    assert.equal(m.scores[1], m.scores[3]);
  }
  assert.ok(m.over, 'the match finishes');
  assert.equal(m.winners.length, 2);
  assert.equal((m.winners[0] + 2) % 4, m.winners[1]);
  assert.ok(Math.max(...m.teamScores) >= 25);
  const again = BatakMatch.fromJSON(JSON.parse(JSON.stringify(m.toJSON())));
  assert.deepEqual(again.winners, m.winners);
});
