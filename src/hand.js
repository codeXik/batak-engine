import { SUITS, dealHands } from './cards.js';
import { legalCards, trickWinner } from './rules.js';
import { scoreRound } from './scoring.js';
import { withDefaults } from './settings.js';
import { suitOf } from './cards.js';

// One round of batak for 4 seats (0..3). Play goes in increasing seat order (counter-clockwise at the table);
// the player to the dealer's right is therefore (dealer + 1) % 4 and speaks first.
// Phases: 'bidding' -> 'trump' -> 'play' -> 'done'. Every illegal action throws.
export class BatakHand {
  constructor({ dealer = 0, hands, rng = Math.random, settings } = {}) {
    this.settings = withDefaults(settings);
    this.dealer = dealer;
    if (hands) {
      this.hands = hands.map((h) => h.slice());
      this.redeals = 0;
    } else {
      const d = dealHands(rng, this.settings);
      this.hands = d.hands;
      this.redeals = d.redeals;
    }
    this.phase = 'bidding';
    this.turn = (dealer + 1) % 4;
    this.firstBidder = this.turn;
    this.bids = [null, null, null, null]; // null = not spoken yet, 'pass' or a number
    this.highBid = 0;
    this.highBidder = -1;
    this.bidder = -1;
    this.bid = 0;
    this.trump = null;
    this.trumpBroken = false;
    this.trick = []; // [{ seat, card }]
    this.tricks = [0, 0, 0, 0];
    this.played = [];
    this.plays = [[], [], [], []]; // cards each seat has played so far (public)
    this.voids = [new Set(), new Set(), new Set(), new Set()]; // suits a seat showed it does not have (public)
    this.elAlmaz = []; // seats that declared no tricks (they are passers in the auction)
    this.king = false; // the bidder declared all 13 tricks
    this.kingMade = false;
    this.scores = null;
  }

  // Copy of the round, optionally with other hands (the computer's "what if" worlds).
  clone(hands = this.hands) {
    const c = new BatakHand({ dealer: this.dealer, hands, settings: this.settings });
    Object.assign(c, {
      phase: this.phase, turn: this.turn, firstBidder: this.firstBidder, bids: this.bids.slice(),
      highBid: this.highBid, highBidder: this.highBidder, bidder: this.bidder, bid: this.bid,
      trump: this.trump, trumpBroken: this.trumpBroken, redeals: this.redeals, elAlmaz: this.elAlmaz.slice(), king: this.king,
      trick: this.trick.map((t) => ({ ...t })), tricks: this.tricks.slice(), played: this.played.slice(),
      plays: this.plays.map((p) => p.slice()), voids: this.voids.map((v) => new Set(v)),
      scores: this.scores && this.scores.slice(),
    });
    return c;
  }

  // A round that is already in the play phase (used to simulate a round before it exists).
  static playing({ dealer = 0, hands, bidder, bid, trump, settings }) {
    const h = new BatakHand({ dealer, hands, settings });
    Object.assign(h, { phase: 'play', bidder, bid, trump, turn: bidder });
    return h;
  }

  #next(seat) {
    return (seat + 1) % 4;
  }

  #active(seat) {
    return this.bids[seat] !== 'pass';
  }

  bidOptions(seat = this.turn) {
    if (this.phase !== 'bidding' || seat !== this.turn) return [];
    const from = Math.max(this.settings.minBid, this.highBid + 1);
    const out = ['pass'];
    if (this.settings.elAlmaz) out.push('elalmaz');
    for (let n = from; n <= 13; n++) out.push(n);
    if (this.settings.king && this.highBid < 13) out.push('king');
    return out;
  }

  placeBid(seat, value) {
    if (this.phase !== 'bidding') throw new Error('Not in the bidding phase');
    if (seat !== this.turn) throw new Error('Not your turn to bid');
    if (value === 'pass') {
      this.bids[seat] = 'pass';
    } else if (value === 'elalmaz') {
      if (!this.settings.elAlmaz) throw new Error('El almaz is switched off');
      this.bids[seat] = 'pass';
      this.elAlmaz.push(seat);
    } else if (value === 'king') {
      if (!this.settings.king || this.highBid >= 13) throw new Error('King is not possible');
      this.bids[seat] = 13;
      this.highBid = 13;
      this.highBidder = seat;
      this.king = true;
    } else {
      if (!Number.isInteger(value) || value < Math.max(this.settings.minBid, this.highBid + 1) || value > 13) {
        throw new Error('Illegal bid');
      }
      this.bids[seat] = value;
      this.highBid = value;
      this.highBidder = seat;
    }
    this.#advanceBidding();
  }

  #advanceBidding() {
    const stillIn = [0, 1, 2, 3].filter((s) => this.#active(s));
    if (this.highBidder >= 0 && (stillIn.length === 1 || this.highBid === 13)) {
      this.bidder = this.highBidder;
      this.bid = this.highBid;
    } else if (this.highBidder < 0 && stillIn.length === 0) {
      // everybody passed: the first bidder is stuck with the base bid
      this.bidder = this.firstBidder;
      this.bid = this.settings.allPassBid;
      this.elAlmaz = this.elAlmaz.filter((x) => x !== this.bidder); // the forced bidder cannot also be El almaz
    } else {
      let s = this.#next(this.turn);
      while (!this.#active(s)) s = this.#next(s);
      this.turn = s;
      return;
    }
    this.phase = 'trump';
    this.turn = this.bidder;
  }

  chooseTrump(seat, suit) {
    if (this.phase !== 'trump') throw new Error('Not in the trump phase');
    if (seat !== this.bidder) throw new Error('Only the bidder chooses trump');
    if (!SUITS.includes(suit)) throw new Error('Unknown suit');
    this.trump = suit;
    this.phase = 'play';
    this.turn = this.bidder;
  }

  legalCards(seat = this.turn) {
    if (this.phase !== 'play' || seat !== this.turn) return [];
    return legalCards(this.hands[seat], this.trick.map((t) => t.card), this.trump, this.trumpBroken, this.settings);
  }

  playCard(seat, card) {
    if (this.phase !== 'play') throw new Error('Not in the play phase');
    if (seat !== this.turn) throw new Error('Not your turn');
    if (!this.hands[seat].includes(card)) throw new Error('You do not hold that card');
    if (!this.legalCards(seat).includes(card)) throw new Error('Illegal card');
    if (this.trick.length > 0 && suitOf(card) !== suitOf(this.trick[0].card)) this.voids[seat].add(suitOf(this.trick[0].card));
    this.hands[seat].splice(this.hands[seat].indexOf(card), 1);
    this.plays[seat].push(card);
    this.trick.push({ seat, card });
    this.played.push(card);
    if (suitOf(card) === this.trump) this.trumpBroken = true;
    if (this.trick.length < 4) {
      this.turn = this.#next(seat);
      return { trickDone: false };
    }
    const win = trickWinner(this.trick.map((t) => t.card), this.trump);
    const winner = this.trick[win].seat;
    this.tricks[winner]++;
    const finished = this.trick;
    this.trick = [];
    this.turn = winner;
    if (this.played.length === 52) {
      this.phase = 'done';
      this.kingMade = this.king && this.tricks[this.bidder] === 13;
      this.scores = scoreRound({ bidder: this.bidder, bid: this.bid, tricks: this.tricks, elAlmaz: this.elAlmaz }, this.settings);
    }
    return { trickDone: true, winner, trick: finished };
  }
}
