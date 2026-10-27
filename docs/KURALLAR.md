# Batak kural belgesi (27 Ekim 2026)

Kaynaklar: Vikipedi (Batak), joker.games, okeydeyim.net ve masalarda yaygın oynanan kurallar; proje sahibinin kararlarıyla birleştirildi. Resmî kural kitabı yoktur; ayrıntılar masadan masaya değiştiği için **bütün varsayılanlar ayardan değişir**. Kural kontrolü, ihale ve puanlama ayrı modüller olur.

## Kurulum
- 4 kişi, bireysel. 52 kart, jokersiz, kişi başı 13. Sıra: As > Papaz > Kız > Vale > 10 … 2.
- Oyun yönü saat yönünün tersi. Bir tur 13 el.
- Eşli Batak: **ilk etapta yok**. Sonra "Eşli" düğmesi olarak eklenecek, ilk sürümde pasif.

## İhale
- İlk konuşan ve ilk ihale sırası: dağıtıcının sağındaki; saat yönünün tersine.
- İlk teklif en az 5; sonraki teklif öncekinden büyük. Pas veren o turda bir daha teklif veremez.
- En yüksek teklif ihaleyi alır (ihaleci) ve kozu seçer.
- **Herkes pas:** ihale 4 ile ilk konuşana (dağıtıcının sağındaki) kalır (karar: 27 Ekim 2026). Koz seçimi onun.

## Kart atma (her hamlede denetlenir)
1. İhaleci ilk kartı atar. Koz kırılmadan (hiç koz oynanmadan) kozla çıkılamaz; istisnalar: elinde yalnız koz kalan, ya da koz serisiyle (As-Papaz-Kız) çıkan.
2. Atılan renge uymak zorunlu; yerdeki en büyüğü geçebiliyorsan geçmek zorundasın.
3. O renk yoksa ve koz varsa koz atmak zorunlu ("koz kırılır"). Yerde koz varsa daha büyük koz gerekir (ayar).
4. O renk ve koz yoksa herhangi bir kart ("çöp"); o kart eli alamaz.
5. Eli en büyük koz, koz yoksa atılan renkteki en büyük kart alır; kazanan sonraki eli açar.
- Geçerli hamle yoksa motor hata verir; geçersiz kart oynatılmaz.

## Puanlama (ayardan seçilir; **varsayılan: 10 katlı**)
- İhaleci tutturursa `10 × ihale + (alınan − ihale)`; tutturamazsa `−10 × ihale`.
- İhaleye girmeyen (pasçı) aldığı her el için +1; **en az 1 el almak zorunlu**, almazsa ihale kadar eksi (varsayılan açık).
- Çarpan (10) ayardan değişir; istenirse "klasik" puanlama ayardan seçilebilir.
- **Ayarlar (varsayılan kapalı):** "3 veya daha fazla el alan batar", "El almaz" (+50 / −50), "King" (13 eli önceden söyleyip almak), oyun bitiş puanı (varsayılan 51, ayarlanabilir; 101 vb.).

## Dağıtım bozdurma (kötü el)
- Varsayılan **kapalı**, ayardan açılır. Kötü el: elde As veya resimli kart (Papaz, Kız, Vale) yok.
- Kontrol: 13 kart dağıtıldıktan sonra, ihaleden önce, oyuncu başına; en az bir oyuncu kötü ele sahipse dağıtım iptal edilip yeniden dağıtılır. Art arda bozdurma için ayarlanabilir üst sınır; aşılırsa dağıtım kabul edilir.

## Motor testleri
13 kart/oyuncu, aynı kart iki kez oynanmaz, sıra doğru ilerler, 13 el oynanır, 52 kart biter, seçilen puan sistemi uygulanır; tavla98 gibi rastgele tam oyun testi.

## El almaz, King, oyun bitişi (ayar, varsayılan kapalı; 1.1.0)

- **El almaz:** İhale sırasında teklif yerine "El almaz" denebilir; ihalede pas sayılır. Hiç el almazsa +50, bir el bile alırsa −50. İhaleyi almayanlara uygulanan "en az 1 el" kuralı bu oyuncuya uygulanmaz. Herkes pas geçerse ihale zorunlu olarak ilk konuşana kalacağı için o oyuncunun "El almaz"ı geçersiz olur.
- **King:** 13 teklifidir (ihale hemen biter). 13 eli de alırsa oyunu anında kazanır; alamazsa 13 ihalesi bozulur (−130). Bu uygulamada deklare edilmeden 13 el almanın özel bir sonucu yoktur (kaynaklar bu konuda ayrışıyor).
- **Oyun bitişi:** Oyun, biri bitiş puanına (varsayılan 51) ulaşınca biter; en yüksek puanlı kazanır, en üstte eşitlik varsa bir tur daha oynanır. Dağıtıcı her turda bir koltuk ilerler.

## Koz Maça (ayar `variant: 'kozmaca'`; 1.4.0)

- İhale yok. Koz her zaman **maça**. Tur doğrudan kart atma aşamasında başlar.
- İlk kartı dağıtıcının sağındaki oyuncu atar; sonraki ellerde eli kazanan açar. Dağıtıcı her turda bir koltuk ilerler.
- Kart atma kuralları ihaleli batakla aynı: renge uy, büyüğü geç, rengin yoksa koz at, koz kırılmadan kozla çıkma (istisnalarıyla).
- Puan: her alınan el 1 puan, her tur toplam 13 puan. Klasik/10 katlı puan sistemi, El almaz ve King bu türde yoktur.
- Oyun, biri bitiş puanına ulaşınca biter; en üstte eşitlik varsa bir tur daha oynanır.

## Eşli Batak (ayar `variant: 'esli'`; 1.5.0)

- İhaleli Batak, iki takımla: **0 ile 2** ve **1 ile 3** numaralı koltuklar eştir (karşılıklı oturanlar). İhale, koz seçimi ve kart atma kuralları ihaleli batakla aynıdır; herkes kendi adına ihale verebilir, eşinin ihalesini geçmek de serbesttir.
- **Puan takım toplamıdır.** İhaleyi alan oyuncunun takımı, eşiyle birlikte ihale kadar el almalıdır.
  - Tutarsa takım: klasikte iki oyuncunun aldığı eller toplamı; 10 katlıda `10 × ihale + fazla el`. Tutmazsa: klasikte `−ihale`, 10 katlıda `−10 × ihale`.
  - Rakip takım: iki oyuncunun aldığı eller toplamı. **Takım olarak en az 1 el** zorunludur; hiç el almazsa `−ihale` (ayar `passerMinTricks`).
  - Bir takımın iki oyuncusu aynı puanı alır.
- El almaz ve King bu türde yoktur (ayarlarda açılırsa motor hata verir).
- Oyun, bir takım bitiş puanına ulaşınca biter; takım puanları eşitse bir tur daha oynanır. `match.winner` kazanan takımın ilk koltuğudur (0 ya da 1), `match.winners` iki koltuğu verir.
- Bilgisayar eşinin ihalesini geçmez, eşi eli tutarken üstüne çıkmaz.

Açık soru kalmadı.
