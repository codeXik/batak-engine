// Round scores. `tricks[seat]` is how many tricks each seat took; `bidder` won the auction with `bid`.
export function scoreRound({ bidder, bid, tricks, elAlmaz = [] }, settings) {
  const { scoring, multiplier, passerMinTricks, passerPenalty, threeOverBusts, elAlmazPoints } = settings;
  return tricks.map((won, seat) => {
    if (elAlmaz.includes(seat)) return won === 0 ? elAlmazPoints : -elAlmazPoints;
    if (seat === bidder) {
      const made = won >= bid && !(threeOverBusts && won - bid >= 3);
      if (scoring === 'classic') return made ? won : -bid;
      return made ? multiplier * bid + (won - bid) : -multiplier * bid;
    }
    if (passerMinTricks > 0 && won < passerMinTricks) return -bid * passerPenalty;
    return won;
  });
}

// Eşli Batak: seats 0+2 play against 1+3. The bidder's team must take `bid` tricks between them; both seats of a
// team get the same score. `tricks[seat]` is how many tricks each seat took.
export function scoreRoundTeams({ bidder, bid, tricks }, settings) {
  const { scoring, multiplier, passerMinTricks, passerPenalty, threeOverBusts } = settings;
  const mate = (bidder + 2) % 4;
  const us = tricks[bidder] + tricks[mate];
  const them = tricks[(bidder + 1) % 4] + tricks[(bidder + 3) % 4];
  const made = us >= bid && !(threeOverBusts && us - bid >= 3);
  let ours;
  if (scoring === 'classic') ours = made ? us : -bid;
  else ours = made ? multiplier * bid + (us - bid) : -multiplier * bid;
  // the other team must take at least passerMinTricks between them
  const theirs = passerMinTricks > 0 && them < passerMinTricks ? -bid * passerPenalty : them;
  return [0, 1, 2, 3].map((seat) => (seat % 2 === bidder % 2 ? ours : theirs));
}
