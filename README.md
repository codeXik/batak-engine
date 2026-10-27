# batak-engine

Türk Batağı (ihaleli batak, 4 kişi) için kural motoru ve bilgisayar oyuncusu. Ücretsizdir, MIT lisanslıdır. Hiçbir pakete bağlı değildir; düz JavaScript (ES modülleri) olduğu için tarayıcıda da Node.js'te de çalışır, derleme gerekmez.

Motorun içinde şunlar var:

- Kartların dağıtılması ve istenirse kötü elin yeniden dağıtılması
- İhale (artırma), koz seçimi
- Her kart atışının kurallara göre denetlenmesi (renge uyma, büyütme, koz atma, koz kırılmadan kozla çıkamama)
- Elin kazananının ve tur puanlarının hesaplanması
- Oyunun bitiş puanına kadar sürmesi (bütün oyun)
- Üç seviyeli bilgisayar oyuncusu: kolay, normal, zor

Her kural masadan masaya değiştiği için ayardan değiştirilebilir (aşağıya bakın).

## Hızlı başlangıç

Dört bilgisayar oyuncusunun bir tur oynaması:

```js
import { BatakHand, botStep } from './src/index.js';

const el = new BatakHand({ dealer: 0 });      // 4 oyuncuya 13'er kart dağıtır
while (el.phase !== 'done') {
  botStep(el, { level: 'zor' });              // sırası gelen bilgisayar bir hamle yapar
}
console.log(el.bidder, el.bid, el.tricks, el.scores);
```

Oyuncular 0, 1, 2, 3 numaralı koltuklarda oturur. Sıra koltuk numarası artarak ilerler (masada saat yönünün tersi). Dağıtıcının sağındaki oyuncu `(dealer + 1) % 4` ilk konuşur.

## Kartlar

Bir kart, renk harfi ve sıra sayısından oluşan metindir. Örnek: `S14` maça ası, `H11` kupa valesi, `D2` karo ikilisi.

| Renk | Harf |
| --- | --- |
| Maça | `S` |
| Kupa | `H` |
| Karo | `D` |
| Sinek | `C` |

Sıralar: 2'den 10'a kadar sayısı, vale `11`, kız `12`, papaz `13`, as `14`.

## İnsan oyuncu için adımlar

Bir turda sırayla üç aşama vardır. `el.phase` hangi aşamada olunduğunu söyler: `bidding` (ihale), `trump` (koz seçimi), `play` (oynama), `done` (bitti). Sırası gelen koltuk `el.turn`'dür.

| Aşama | Ne yapılır | Komut |
| --- | --- | --- |
| İhale | Yapılabilecek teklifleri öğren | `el.bidOptions()` (örnek: `['pass', 5, 6, ... 13]`) |
| İhale | Teklif ver ya da pas geç | `el.placeBid(koltuk, 6)` veya `el.placeBid(koltuk, 'pass')` |
| Koz | İhaleyi alan kozu seçer | `el.chooseTrump(koltuk, 'S')` |
| Oynama | Atılabilecek kartları öğren | `el.legalCards()` |
| Oynama | Kart at | `el.playCard(koltuk, 'H14')` |

Kurala aykırı her hamlede (sırası olmayan oyuncu, elinde olmayan kart, geçersiz teklif, atılamayacak kart) motor hata verir ve durumu değiştirmez; yanlış hamle sessizce kabul edilmez.

Tur bitince `el.scores` her koltuğun tur puanını, `el.tricks` aldığı el sayısını, `el.bidder` ve `el.bid` ihaleciyi ve teklifini gösterir.

Ekranda göstermek için geçmiş de tutulur:

| Bilgi | Nerede |
| --- | --- |
| İhalede kim ne dedi (sırasıyla) | `el.auction` (örnek: `[{ seat: 1, bid: 5 }, { seat: 2, bid: 'pass' }]`) |
| Biten eller (kim açtı, hangi kartlar, kim aldı) | `el.history` |
| Son biten el ("son eli göster") | `el.lastTrick` |
| Yerdeki kartlar | `el.trick` |

## Kaydetme ve yükleme

Oyun her an metne çevrilip saklanabilir, sonra kaldığı yerden sürer (örneğin eklenti penceresi kapanıp açıldığında):

```js
const kayit = JSON.stringify(oyun);                       // BatakMatch ya da BatakHand
const oyun2 = BatakMatch.fromJSON(JSON.parse(kayit));     // tek tur için BatakHand.fromJSON
```

Bozuk ya da tutarsız kayıt (aynı kart iki yerde, bilinmeyen biçim) yüklenmez, hata verir.

## Oyuncu görünümü

`el.view(koltuk)` yalnız o koltuğun görmesi gerekenleri verir: kendi kartları, ötekilerin kaç kartı kaldığı, yerdeki kartlar, geçmiş, puanlar, atabileceği kartlar ve verebileceği teklifler. Rakiplerin kartları içinde yoktur; arayüz bunu kullanırsa kartlar yanlışlıkla görünmez.

Yanlış ayar (bilinmeyen ad, aralık dışı değer) ve yanlış dağıtım (aynı kart iki kez, geçersiz kart) verilirse motor hata verir.

## Bütün oyun

`BatakMatch`, turları bitiş puanına kadar sürdürür. Dağıtıcı her turda bir koltuk ilerler; biri bitiş puanına (varsayılan 51) ulaşınca oyun biter ve en yüksek puanlı kazanır. En üstte eşitlik varsa bir tur daha oynanır.

```js
import { BatakMatch, botStep } from './src/index.js';

const oyun = new BatakMatch({ settings: { targetScore: 51 } });
while (!oyun.over) {
  const el = oyun.startRound();
  while (el.phase !== 'done') botStep(el, { level: 'normal' });
  oyun.finishRound();                    // puanları toplar, oyunun bitip bitmediğine bakar
}
console.log(oyun.winner, oyun.scores);
```

`oyun.standings` sıralamayı verir (`[{ seat, score, place }]`, eşit puanlılar aynı sırayı paylaşır). `oyun.rounds` her turun özetidir: dağıtıcı, ihaleci, ihale, koz, alınan eller, puanlar.

## Kurallar

Kuralların tamamı [docs/KURALLAR.md](docs/KURALLAR.md) dosyasındadır. Özet:

- 52 kart, her oyuncuya 13. Sıralama: As, Papaz, Kız, Vale, 10 … 2.
- İhale en az 5'ten başlar, her teklif öncekinden büyük olmalıdır. Pas veren o tur bir daha teklif veremez. Herkes pas geçerse ilk konuşana 4 ihalesi kalır.
- İhaleyi alan kozu seçer ve ilk kartı atar. Koz kırılmadan (hiç koz oynanmadan) kozla çıkılamaz.
- Atılan renge uymak, yerdeki en büyük kartı geçebiliyorsan geçmek zorunludur. O renk yoksa koz atılır, koz da yoksa istenen kart atılır.
- İhaleci tutturursa `10 × ihale + fazla el`, tutturamazsa `−10 × ihale` alır. İhaleyi almayanlar her eli için 1 puan alır, hiç el almazsa ihale kadar eksi puan yer.

### Ayarlar

`new BatakHand({ settings: { ... } })` ve `new BatakMatch({ settings: { ... } })` ile verilir. Varsayılanlar [src/settings.js](src/settings.js) dosyasındadır.

| Ayar | Varsayılan | Anlamı |
| --- | --- | --- |
| `minBid` | 5 | En düşük ihale |
| `allPassBid` | 4 | Herkes pas geçince ilk konuşana kalan ihale |
| `mustOvertake` | açık | Aynı renkte büyütme zorunlu |
| `mustOvertrump` | açık | Kozu büyütme zorunlu |
| `scoring` | `x10` | `x10` (10 katlı) ya da `classic` (klasik) puanlama |
| `multiplier` | 10 | 10 katlı puanlamada çarpan |
| `passerMinTricks` | 1 | İhaleyi almayanların almak zorunda olduğu en az el (0 = kapalı) |
| `threeOverBusts` | kapalı | İhaleden 3 ve fazla el alan da batar |
| `redealBadHand` | kapalı | Kötü ele (As ve resimli kart yok) dağıtımı bozdurma |
| `maxRedeals` | 3 | Art arda en çok kaç kez bozdurulabilir |
| `targetScore` | 51 | Oyunun bitiş puanı |
| `elAlmaz` | kapalı | İhale sırasında "El almaz" demeye izin verir |
| `elAlmazPoints` | 50 | "El almaz" puanı (tutarsa artı, bozarsa eksi) |
| `king` | kapalı | "King" demeye izin verir |

**El almaz:** Kendi sırasında teklif vermek yerine `el.placeBid(koltuk, 'elalmaz')` denir. O oyuncu ihalede pas sayılır. Tur sonunda hiç el almamışsa `+50`, tek el bile almışsa `−50` puan alır; ihaleyi almayanlara uygulanan "en az 1 el" kuralı ona uygulanmaz.

**King:** `el.placeBid(koltuk, 'king')` 13 elin hepsini alacağını söylemektir (13 teklifidir, ihaleyi hemen bitirir). 13 eli de alırsa oyunu o anda kazanır (`el.kingMade`); alamazsa 13 ihalesi bozulmuş olur ve `−130` yazılır.

## Bilgisayar oyuncusu

`botStep(el, { level })` sırası gelen koltuk için bir hamle yapar (ihale, koz ya da kart). Ayrı ayrı çağırmak için `botBid`, `botTrump`, `botCard` vardır.

- **kolay:** Acemi gibi oynar, ara sıra rastgele kart atar.
- **normal:** Elini değerlendirerek ihale ve koz seçer, kart atarken en uygun kartı bulmaya çalışır.
- **zor:** Oynanan kartları sayar, kimin hangi renkten bittiğini izler ve ihaleciyi ihale kadar güçlü bir elle düşünür. Sonra kalan kartların olası dağılımlarını oyun sonuna kadar oynatıp en iyi kartı ve ihaleyi seçer. `thinkMs` ile düşünme süresi (milisaniye) verilir, süre arttıkça oyun güçlenir.

Ayarda açıksa normal ve zor seviye El almaz ve King de der: El almaz'ı yalnız başkası teklif verdikten sonra ve el alma ihtimali çok düşük bir elle der; King'i 13 eli alabilecek bir elle der. El almaz diyen bilgisayar hiç el almamaya çalışır; ötekiler de El almaz oyuncusunun aldığı ele karışmaz.

Zor seviye düşünürken yarım saniye kadar işlemciyi doldurur. Tarayıcıda ekranın donmaması için `botStep`'i bir Web Worker içinde çalıştırın.

## Test

```
npm test
```

Kural birimleri, rastgele tam oyunlar, bütün oyunlar ve bilgisayar oyuncuları sınanır.

## Lisans

MIT, © 2026 Skynon Labs Ltd. Motoru kullanan uygulamalarda adının anılması (örneğin "Hakkında" ekranında) rica olunur; zorunlu değildir.

---

*English:* Dependency-free rules engine and computer player for Turkish Batak (bidding spades, 4 players). Plain ES modules; runs in browsers and Node.js. MIT licensed. See the code samples above.
