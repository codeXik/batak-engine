# batak-engine

Türk Batağı (ihaleli batak, 4 kişilik) için kural motoru ve bilgisayar oyuncusu. Ücretsizdir ve MIT lisansıyla dağıtılır. Başka hiçbir pakete ihtiyaç duymaz. Düz JavaScript ile yazıldığı için tarayıcıda da Node.js'te de derlemeden çalışır.

Motor şunları yapar:

- Kartları dağıtır; istenirse kötü gelen eli yeniden dağıtır.
- İhaleyi ve koz seçimini yürütür.
- Atılan her kartı kurala göre denetler: renge uyma, büyütme, koz atma, koz kırılmadan kozla çıkmama.
- Eli kimin aldığını ve tur puanlarını hesaplar.
- Oyunu bitiş puanına kadar sürdürür.
- Kaydedilip sonra kaldığı yerden sürdürülebilir.
- Çevrim içi oyunda sunucuda hakem olarak çalışabilir.
- Üç seviyede bilgisayar oyuncusu içerir: kolay, normal ve zor.

Masadan masaya değişen her kural ayardan seçilebilir (aşağıda "Ayarlar" bölümüne bakın).

## Hızlı başlangıç

Dört bilgisayarın birlikte bir tur oynaması:

```js
import { BatakHand, botStep } from './src/index.js';

const el = new BatakHand({ dealer: 0 });   // her oyuncuya 13 kart dağıtır
while (el.phase !== 'done') {
  botStep(el, { level: 'zor' });           // sırası gelen bilgisayar hamlesini yapar
}
console.log(el.bidder, el.bid, el.tricks, el.scores);
```

Oyuncular 0, 1, 2 ve 3 numaralı koltuklarda oturur. Sıra, koltuk numarası artacak yönde ilerler; bu, masada saat yönünün tersidir. İlk konuşan, dağıtıcının sağındaki oyuncudur, yani `(dealer + 1) % 4` numaralı koltuk.

## Kartların yazılışı

Her kart, önce rengin harfi sonra kartın değeri yazılarak gösterilir. Örneğin `S14` maça ası, `H11` kupa valesi, `D2` karo ikilisidir.

| Renk | Harf |
| --- | --- |
| Maça | `S` |
| Kupa | `H` |
| Karo | `D` |
| Sinek | `C` |

2'den 10'a kadar olan kartlar kendi sayısıyla yazılır. Vale `11`, kız `12`, papaz `13`, as `14` ile gösterilir.

## Bir turun oynanışı

Her tur sırasıyla üç aşamadan geçer. Hangi aşamada olunduğu `el.phase` ile öğrenilir:

- `bidding`: ihale
- `trump`: koz seçimi
- `play`: kart oynama
- `done`: tur bitti

Sıranın hangi koltukta olduğu `el.turn` ile öğrenilir.

| Aşama | Yapılan iş | Kullanılacak komut |
| --- | --- | --- |
| İhale | Verilebilecek teklifleri öğrenmek | `el.bidOptions()` (örneğin `['pass', 5, 6, … 13]`) |
| İhale | Teklif vermek ya da pas geçmek | `el.placeBid(koltuk, 6)` ya da `el.placeBid(koltuk, 'pass')` |
| Koz | İhaleyi alanın kozu seçmesi | `el.chooseTrump(koltuk, 'S')` |
| Oynama | Atılabilecek kartları öğrenmek | `el.legalCards()` |
| Oynama | Kart atmak | `el.playCard(koltuk, 'H14')` |

Kurala aykırı bir hamle motor tarafından reddedilir ve oyunun durumu değişmez. Sırası gelmeyen oyuncunun hamlesi, elde olmayan bir kart, geçersiz bir teklif ya da atılması yasak bir kart buna örnektir.

Tur bittiğinde şu bilgiler hazırdır:

- `el.scores`: her koltuğun bu turdaki puanı
- `el.tricks`: her koltuğun aldığı el sayısı
- `el.bidder`, `el.bid`: ihaleyi alan koltuk ve teklifi

Ekranda göstermek için oyunun geçmişi de tutulur:

| Bilgi | Nerede bulunur |
| --- | --- |
| İhalede sırasıyla kim ne dedi | `el.auction` (örneğin `[{ seat: 1, bid: 5 }, { seat: 2, bid: 'pass' }]`) |
| Biten eller: kim açtı, hangi kartlar atıldı, eli kim aldı | `el.history` |
| En son biten el ("son eli göster" için) | `el.lastTrick` |
| Şu an yerde duran kartlar | `el.trick` |

## Bütün oyun

`BatakMatch`, oyunu bitiş puanına kadar tur tur sürdürür. Her turda dağıtıcı bir sonraki koltuğa geçer. Bir oyuncu bitiş puanına (varsayılan 51) ulaştığında oyun biter ve en yüksek puanlı oyuncu kazanır. En yüksek puanda eşitlik varsa bir tur daha oynanır.

```js
import { BatakMatch, botStep } from './src/index.js';

const oyun = new BatakMatch({ settings: { targetScore: 51 } });
while (!oyun.over) {
  const el = oyun.startRound();
  while (el.phase !== 'done') botStep(el, { level: 'normal' });
  oyun.finishRound();   // puanları ekler ve oyunun bitip bitmediğine bakar
}
console.log(oyun.winner, oyun.scores);
```

`oyun.standings` oyuncuların sıralamasını verir: `[{ seat, score, place }]`. Puanı eşit olan oyuncular aynı sırada yer alır. `oyun.rounds` ise her turun özetini tutar: dağıtıcı, ihaleyi alan, ihale, koz, alınan eller ve puanlar.

## Kaydetme ve yükleme

Oyun istenen her an kaydedilip daha sonra kaldığı yerden sürdürülebilir. Örneğin eklentinin penceresi kapanıp yeniden açıldığında oyun kaybolmaz:

```js
const kayit = JSON.stringify(oyun);                    // BatakMatch ya da BatakHand
const oyun2 = BatakMatch.fromJSON(JSON.parse(kayit));  // tek bir tur için BatakHand.fromJSON
```

Bozuk ya da tutarsız bir kayıt yüklenmez; motor hata verir. Aynı kartın iki yerde görünmesi, el sayılarının tutmaması ya da kayıt biçiminin tanınmaması buna örnektir.

## Oyuncunun görebildikleri

`el.view(koltuk)` yalnızca o koltuktaki oyuncunun görmesi gereken bilgileri verir: kendi kartları, diğer oyuncuların elinde kaç kart kaldığı, yerdeki kartlar, oyunun geçmişi, puanlar, atabileceği kartlar ve verebileceği teklifler. Rakiplerin kartları bu bilgilerin içinde yer almaz; arayüz bunu kullandığında rakip kartları yanlışlıkla görünmez. Bütün oyun için `oyun.view(koltuk)` kullanılır.

## Çevrim içi oyun

Çevrim içi oyunda motor sunucuda çalışır ve oyunun tek hakemi odur. Oyuncular yalnızca hamlelerini gönderir. Sunucu her hamleyi `el.act` ile işler ve her oyuncuya kendi görebileceği bilgileri `view(koltuk)` ile gönderir.

```js
const sonuc = el.act(koltuk, { type: 'card', value: 'H14', seq: 12 });
// başarılıysa { ok: true, seq: 13, … }, değilse örneğin { ok: false, error: 'notYourTurn' }
```

| Hamle | Gönderiliş biçimi |
| --- | --- |
| Teklif | `{ type: 'bid', value: 5 }` (ya da `'pass'`, `'elalmaz'`, `'king'`) |
| Koz | `{ type: 'trump', value: 'S' }` |
| Kart | `{ type: 'card', value: 'H14' }` |

- `act` hiçbir durumda çökmez; her zaman bir sonuç döndürür. Olası hata kodları şunlardır: `badAction` (mesaj bozuk), `stale` (hamle eski bir duruma göre gönderilmiş), `gameOver` (tur bitmiş), `notYourTurn` (sıra o oyuncuda değil), `wrongPhase` (bu aşamada bu hamle yapılamaz), `illegal` (kurala aykırı).
- **Hamle numarası:** `el.seq` her hamlede bir artar. Oyuncu hamlesiyle birlikte gördüğü numarayı da gönderirse geç kalan ya da iki kez gönderilen hamle `stale` koduyla reddedilir. En son yapılan hamle `el.lastAction` içinde durur.
- `el.expects(koltuk)` o koltuktan hangi hamlenin beklendiğini söyler: `'bid'`, `'trump'`, `'card'` ya da hiçbiri için `null`.
- **Güvenli karıştırma:** Kartlar, tarayıcının ya da Node.js'in (19 ve üstü) şifrelemede kullanılan rastgele sayı üreticisiyle karıştırılır. Böylece dağıtım önceden tahmin edilemez. Aynı üretici `secureRandom` adıyla da kullanılabilir. Testlerde her seferinde aynı dağıtımı elde etmek için kendi `rng` işlevinizi verebilirsiniz.
- **Bağlantısı kopan oyuncu:** `botAction(el, { level })` bilgisayarın yapacağı hamleyi, hamleyi yapmadan döndürür. Sunucu, süresi dolan oyuncunun yerine bu hamleyi `act` ile oynatabilir. Aynı yolla bilgisayar bir Web Worker'da düşünüp hamlesini ana sayfaya gönderebilir.

Bilinmeyen ya da sınır dışı bir ayar, aynı kartın iki kez dağıtılması ya da geçersiz bir kart verilirse motor hata verir.

## Kurallar

Kuralların tamamı [docs/KURALLAR.md](docs/KURALLAR.md) dosyasındadır. Kısaca:

- 52 kartla oynanır, her oyuncuya 13 kart dağıtılır. Kartların büyüklük sırası: as, papaz, kız, vale, 10, 9 … 2.
- İhale en az 5 ile başlar ve her teklif bir öncekinden büyük olmalıdır. Pas geçen oyuncu o turda bir daha teklif veremez. Herkes pas geçerse ilk konuşan oyuncu 4 ihalesiyle oynamak zorunda kalır.
- İhaleyi alan oyuncu kozu seçer ve ilk kartı o atar. Koz kırılmadan, yani o tura kadar hiç koz oynanmadan, kozla oyuna çıkılamaz.
- Yerdeki renkten kart atmak zorunludur; o renkte yerdeki en büyük kartı geçebiliyorsanız geçmek de zorunludur. O renkten kartınız yoksa koz atarsınız, koz da yoksa istediğiniz kartı atabilirsiniz.
- İhaleyi alan, ihalesini tutturursa `10 × ihale + fazladan aldığı el sayısı` kadar puan alır; tutturamazsa `10 × ihale` kadar puan kaybeder. İhaleyi almayan oyuncular aldıkları her el için 1 puan kazanır; hiç el alamayan, ihale kadar puan kaybeder.

### Ayarlar

Ayarlar `new BatakHand({ settings: { … } })` ya da `new BatakMatch({ settings: { … } })` ile verilir. Varsayılan değerler [src/settings.js](src/settings.js) dosyasındadır.

| Ayar | Varsayılan | Anlamı |
| --- | --- | --- |
| `minBid` | 5 | En düşük ihale |
| `allPassBid` | 4 | Herkes pas geçerse ilk konuşanın oynamak zorunda olduğu ihale |
| `mustOvertake` | açık | Aynı renkte yerdeki kartı geçmek zorunlu |
| `mustOvertrump` | açık | Yerdeki kozu daha büyük kozla geçmek zorunlu |
| `scoring` | `x10` | Puanlama: `x10` (10 katlı) ya da `classic` (klasik) |
| `multiplier` | 10 | 10 katlı puanlamadaki çarpan |
| `passerMinTricks` | 1 | İhaleyi almayanların almak zorunda olduğu en az el sayısı (0 yazılırsa bu kural kapanır) |
| `threeOverBusts` | kapalı | İhalesinden 3 ya da daha fazla el fazla alan da batmış sayılır |
| `redealBadHand` | kapalı | Kötü gelen elde (hiç as ya da resimli kart yoksa) kartlar yeniden dağıtılır |
| `maxRedeals` | 3 | Kartların art arda en fazla kaç kez yeniden dağıtılabileceği |
| `variant` | `'ihaleli'` | Oyun türü: `'ihaleli'` (ihaleli batak) ya da `'kozmaca'` (Koz Maça: ihale yok, koz hep maça, her el 1 puan) |
| `targetScore` | 51 | Oyunun bitiş puanı |
| `elAlmaz` | kapalı | İhalede "El almaz" denebilir |
| `elAlmazPoints` | 50 | "El almaz"ın puanı: tutarsa kazanılır, bozulursa kaybedilir |
| `king` | kapalı | İhalede "King" denebilir |

**El almaz:** Oyuncu kendi sırasında teklif vermek yerine `el.placeBid(koltuk, 'elalmaz')` der ve ihalede pas geçmiş sayılır. Tur sonunda hiç el almamışsa 50 puan kazanır, tek bir el bile almışsa 50 puan kaybeder. İhaleyi almayanlar için geçerli olan "en az bir el alma" kuralı bu oyuncuya uygulanmaz.

**King:** `el.placeBid(koltuk, 'king')` diyen oyuncu 13 elin hepsini alacağını söylemiş olur. Bu 13'lük bir tekliftir ve ihaleyi hemen bitirir. Oyuncu 13 elin hepsini alırsa oyunu o anda kazanır (`el.kingMade`). Alamazsa 13 ihalesiyle batmış sayılır ve 130 puan kaybeder.

## Bilgisayar oyuncusu

`botStep(el, { level })`, sırası gelen koltuk için bir hamle yapar: teklif, koz seçimi ya da kart. Her birini ayrı ayrı yaptırmak için `botBid`, `botTrump` ve `botCard` kullanılabilir.

- **Kolay:** Acemi bir oyuncu gibi oynar; ara sıra rastgele kart atar.
- **Normal:** Elini değerlendirerek teklif verir ve koz seçer; kart atarken en uygun kartı bulmaya çalışır.
- **Zor:** Oynanan kartları sayar, kimin hangi renkte kartı kalmadığını takip eder ve ihaleyi alanın elinin ihalesine yetecek kadar güçlü olduğunu varsayar. Ardından kalan kartların olası dağılımlarını tur sonuna kadar oynatarak en iyi kartı ve teklifi seçer. Düşünme süresi `thinkMs` ile milisaniye olarak verilir; süre uzadıkça bilgisayar daha iyi oynar.

Ayarlarda açıksa normal ve zor bilgisayarlar "El almaz" ve "King" de diyebilir. "El almaz"ı yalnızca başka bir oyuncu teklif verdikten sonra ve el alma olasılığı çok düşük bir elle der. "King"i ise 13 elin hepsini alabilecek bir elle der. "El almaz" diyen bilgisayar hiç el almamaya çalışır; diğer bilgisayarlar da bu oyuncunun eline geçecek eli ondan almaz.

Zor seviyedeki bilgisayar her hamlede yaklaşık yarım saniye işlemciyi meşgul eder. Tarayıcıda ekranın donmaması için bilgisayarın hamlelerini bir Web Worker içinde hesaplatın.

## Test

```
npm test
```

Testler kural parçalarını, rastgele oynanan tam turları, bütün oyunları, kaydetme ve yüklemeyi ve bilgisayar oyuncularını sınar.

## Lisans

MIT lisansı, © 2026 Skynon Labs Ltd. Motoru kullanan uygulamaların motorun adını (örneğin "Hakkında" ekranında) anması rica edilir; zorunlu değildir.

---

*English:* A dependency-free rules engine and computer player for Turkish Batak (a 4-player bidding trick-taking card game). Written in plain JavaScript modules, it runs in browsers and in Node.js. MIT licensed. See the code examples above.
