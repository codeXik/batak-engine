# batak-engine

Türk Batağı (ihaleli, 4 kişi) için bağımlılıksız, ücretsiz kural motoru ve bilgisayar oyuncusu. Düz JavaScript (ES modülleri), derleme aracı yok; tarayıcıda ve Node.js'te çalışır. MIT lisanslı.

Dependency-free rules engine and computer player for Turkish Batak (bidding spades, 4 players). Plain ES modules, runs in browsers and Node.js. MIT licensed.

## Kullanım / Usage

```js
import { BatakHand, botStep } from './src/index.js';

const hand = new BatakHand({ dealer: 0 });          // deals 13 cards to each of 4 seats
while (hand.phase !== 'done') {
  botStep(hand, { level: 'zor', thinkMs: 300 });     // 'kolay' | 'normal' | 'zor'
}
console.log(hand.bidder, hand.bid, hand.tricks, hand.scores);
```

Bir insan oyuncu için: `hand.bidOptions()`, `hand.placeBid(seat, 'pass' | n)`, `hand.chooseTrump(seat, 'S')`, `hand.legalCards()`, `hand.playCard(seat, 'H14')`. Kartlar `renk + sıra` metnidir (`S14` = maça ası; `S` maça, `H` kupa, `D` karo, `C` sinek; vale 11, kız 12, papaz 13, as 14). Geçersiz her hamle hata fırlatır.

## Kurallar

Ayrıntı: [docs/KURALLAR.md](docs/KURALLAR.md). Kısaca: 52 kart, kişi başı 13; ihale tabanı 5, herkes pas geçerse ilk konuşana 4; ihaleci kozu seçer; renge uyma, büyütme ve koz atma zorunlu; koz kırılmadan kozla çıkılmaz. Masadan masaya değişen her şey `settings` ile ayarlanır (`src/settings.js`): büyütme zorunluluğu, puanlama (`x10` / `classic`), pasçı en az el, "3 fazla batar", kötü ele dağıtım bozdurma ve diğerleri.

## Bilgisayar oyuncusu

- `kolay`: acemi, ara sıra rastgele oynar.
- `normal`: el değerlendirme ve temel kurallarla ihale, koz ve kart seçer.
- `zor`: oynanan kartları sayar, kimin hangi renkten boş olduğunu izler, ihaleciyi ihale kadar güçlü bir elle tahmin eder; olası elleri sonuna kadar oynatıp en iyi kartı ve ihaleyi seçer. `thinkMs` düşünme süresidir. Tarayıcıda ana iş parçacığını bloklamamak için Web Worker içinde çalıştırmanız önerilir.

## Test

```
npm test
```

Kural birimleri, rastgele tam oyunlar ve bilgisayar oyuncuları sınanır.

## Lisans

MIT, © 2026 Skynon Labs Ltd. Kullanan uygulamalardan adının anılması rica edilir (örn. Hakkında ekranı).
