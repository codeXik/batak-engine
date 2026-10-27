# batak98 — kural belgesi (27 Ekim 2026)

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

Açık soru kalmadı.
