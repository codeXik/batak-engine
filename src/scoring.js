// Round scores. `tricks[seat]` is how many tricks each seat took; `bidder` won the auction with `bid`.
export function scoreRound({ bidder, bid, tricks }, settings) {
  const { scoring, multiplier, passerMinTricks, passerPenalty, threeOverBusts } = settings;
  return tricks.map((won, seat) => {
    if (seat === bidder) {
      const made = won >= bid && !(threeOverBusts && won - bid >= 3);
      if (scoring === 'classic') return made ? won : -bid;
      return made ? multiplier * bid + (won - bid) : -multiplier * bid;
    }
    if (passerMinTricks > 0 && won < passerMinTricks) return -bid * passerPenalty;
    return won;
  });
}
