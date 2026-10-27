import { BatakHand } from './hand.js';
import { withDefaults } from './settings.js';

// A whole game: rounds are played until somebody reaches settings.targetScore.
// The dealer moves one seat per round (the same direction as the play). A successful King wins at once.
export class BatakMatch {
  constructor({ settings, rng = Math.random, dealer = 0 } = {}) {
    this.settings = withDefaults(settings);
    this.rng = rng;
    this.dealer = dealer;
    this.scores = [0, 0, 0, 0];
    this.rounds = []; // [{ dealer, bidder, bid, tricks, scores, king }]
    this.winner = -1;
    this.hand = null;
  }

  get over() {
    return this.winner >= 0;
  }

  startRound() {
    if (this.over) throw new Error('The match is over');
    if (this.hand && this.hand.phase !== 'done') throw new Error('The round is not finished');
    this.hand = new BatakHand({ dealer: this.dealer, rng: this.rng, settings: this.settings });
    return this.hand;
  }

  // Call when the current round is done: adds the scores and decides whether the match is over.
  finishRound() {
    const h = this.hand;
    if (!h || h.phase !== 'done') throw new Error('The round is not finished');
    if (this.rounds.length && this.rounds[this.rounds.length - 1].hand === h) throw new Error('Round already counted');
    h.scores.forEach((x, i) => (this.scores[i] += x));
    this.rounds.push({
      hand: h, dealer: this.dealer, bidder: h.bidder, bid: h.bid, tricks: h.tricks.slice(),
      scores: h.scores.slice(), king: h.kingMade,
    });
    this.dealer = (this.dealer + 1) % 4;
    if (h.kingMade) {
      this.winner = h.bidder;
    } else {
      const top = Math.max(...this.scores);
      // a tie at the top (target reached) means one more round
      if (top >= this.settings.targetScore && this.scores.filter((s) => s === top).length === 1) {
        this.winner = this.scores.indexOf(top);
      }
    }
    return { over: this.over, winner: this.winner, scores: this.scores.slice() };
  }
}
