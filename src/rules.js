import { suitOf, rankOf } from './cards.js';

const best = (cards) => cards.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));

// Cards the player may play now. `trick` is the cards on the table in play order,
// `trumpBroken` is true once any trump has been played in this round.
export function legalCards(hand, trick, trump, trumpBroken, settings) {
  const trumps = hand.filter((c) => suitOf(c) === trump);

  if (trick.length === 0) {
    const others = hand.filter((c) => suitOf(c) !== trump);
    if (trumpBroken || others.length === 0) return hand.slice();
    // trump cannot be led before it is broken, except from a top sequence (A, K, Q)
    const ranks = trumps.map(rankOf);
    if ([14, 13, 12].every((r) => ranks.includes(r))) {
      return hand.filter((c) => suitOf(c) !== trump || rankOf(c) >= 12);
    }
    return others;
  }

  const led = suitOf(trick[0]);
  const trumpsOnTable = trick.filter((c) => suitOf(c) === trump);
  const follow = hand.filter((c) => suitOf(c) === led);

  if (follow.length > 0) {
    if (led === trump) {
      if (!settings.mustOvertrump) return follow;
      const higher = follow.filter((c) => rankOf(c) > rankOf(best(trumpsOnTable)));
      return higher.length ? higher : follow;
    }
    // somebody already cut: the led suit cannot win any more
    if (trumpsOnTable.length > 0 || !settings.mustOvertake) return follow;
    const bestLed = best(trick.filter((c) => suitOf(c) === led));
    const higher = follow.filter((c) => rankOf(c) > rankOf(bestLed));
    return higher.length ? higher : follow;
  }

  if (trumps.length > 0) {
    if (trumpsOnTable.length > 0 && settings.mustOvertrump) {
      const higher = trumps.filter((c) => rankOf(c) > rankOf(best(trumpsOnTable)));
      return higher.length ? higher : trumps;
    }
    return trumps;
  }
  return hand.slice(); // nothing to follow, no trump: discard anything (cannot win)
}

// Index (into `trick`) of the winning card.
export function trickWinner(trick, trump) {
  const led = suitOf(trick[0]);
  const pool = trick.some((c) => suitOf(c) === trump) ? trump : led;
  let win = -1;
  trick.forEach((c, i) => {
    if (suitOf(c) === pool && (win < 0 || rankOf(c) > rankOf(trick[win]))) win = i;
  });
  return win;
}
