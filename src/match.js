import { BatakHand } from './hand.js';
import { defaultRandom } from './cards.js';
import { withDefaults } from './settings.js';

const SAVE_VERSION = 1;

// A whole game: rounds are played until somebody reaches settings.targetScore.
// The dealer moves one seat per round (the same direction as the play). A successful King wins at once.
export class BatakMatch {
  constructor({ settings, rng = defaultRandom, dealer = 0 } = {}) {
    if (!Number.isInteger(dealer) || dealer < 0 || dealer > 3) throw new Error('Dealer must be a seat 0..3');
    this.settings = withDefaults(settings);
    this.rng = rng;
    this.dealer = dealer;
    this.scores = [0, 0, 0, 0];
    this.rounds = []; // [{ dealer, bidder, bid, trump, tricks, scores, elAlmaz, king }]
    this.winner = -1;
    this.hand = null;
    this.counted = false; // the current round's scores are already added
  }

  get over() {
    return this.winner >= 0;
  }

  // Eşli Batak: the two team scores [seats 0+2, seats 1+3].
  get teamScores() {
    return [this.scores[0], this.scores[1]];
  }

  // The seats of the winning team (Eşli Batak) or of the winner alone; [] while the match is running.
  get winners() {
    if (!this.over) return [];
    return this.settings.variant === 'esli' ? [this.winner, this.winner + 2] : [this.winner];
  }

  // Seats from first to last place: [{ seat, score, place }]; equal scores share a place.
  get standings() {
    const order = [0, 1, 2, 3].sort((a, b) => this.scores[b] - this.scores[a] || a - b);
    return order.map((seat) => ({ seat, score: this.scores[seat], place: 1 + this.scores.filter((s) => s > this.scores[seat]).length }));
  }

  startRound() {
    if (this.over) throw new Error('The match is over');
    if (this.hand && !this.counted) throw new Error('The round is not finished');
    this.hand = new BatakHand({ dealer: this.dealer, rng: this.rng, settings: this.settings });
    this.counted = false;
    return this.hand;
  }

  // Call when the current round is done: adds the scores and decides whether the match is over.
  finishRound() {
    const h = this.hand;
    if (!h || h.phase !== 'done') throw new Error('The round is not finished');
    if (this.counted) throw new Error('Round already counted');
    this.counted = true;
    h.scores.forEach((x, i) => (this.scores[i] += x));
    this.rounds.push({
      dealer: this.dealer, bidder: h.bidder, bid: h.bid, trump: h.trump, tricks: h.tricks.slice(),
      scores: h.scores.slice(), elAlmaz: h.elAlmaz.slice(), king: h.kingMade,
    });
    this.dealer = (this.dealer + 1) % 4;
    if (h.kingMade) {
      this.winner = h.bidder;
    } else if (this.settings.variant === 'esli') {
      // two teams (seats 0+2, 1+3) share their score; `winner` is the first seat of the winning team
      const [a, b] = this.teamScores;
      if (Math.max(a, b) >= this.settings.targetScore && a !== b) this.winner = a > b ? 0 : 1;
    } else {
      const top = Math.max(...this.scores);
      // a tie at the top (target reached) means one more round
      if (top >= this.settings.targetScore && this.scores.filter((s) => s === top).length === 1) {
        this.winner = this.scores.indexOf(top);
      }
    }
    return { over: this.over, winner: this.winner, scores: this.scores.slice() };
  }

  // What `seat` is allowed to see of the whole match (the current round through BatakHand.view).
  view(seat) {
    const { version, hand, ...pub } = this.toJSON();
    return { ...pub, seat, over: this.over, standings: this.standings, round: this.rounds.length + (this.counted ? 0 : 1), hand: this.hand && this.hand.view(seat) };
  }

  // Plain object (JSON safe) with the whole match, the round in progress included.
  toJSON() {
    return {
      version: SAVE_VERSION, settings: { ...this.settings }, dealer: this.dealer, scores: this.scores.slice(),
      rounds: this.rounds.map((r) => ({ ...r, tricks: r.tricks.slice(), scores: r.scores.slice(), elAlmaz: r.elAlmaz.slice() })),
      winner: this.winner, counted: this.counted, hand: this.hand && this.hand.toJSON(),
    };
  }

  static fromJSON(data, { rng = defaultRandom } = {}) {
    if (!data || data.version !== SAVE_VERSION) throw new Error('Unknown save format');
    const m = new BatakMatch({ settings: data.settings, rng, dealer: data.dealer });
    const copy = JSON.parse(JSON.stringify({ scores: data.scores, rounds: data.rounds }));
    Object.assign(m, { scores: copy.scores, rounds: copy.rounds, winner: data.winner, counted: data.counted });
    m.hand = data.hand ? BatakHand.fromJSON(data.hand) : null;
    return m;
  }
}
