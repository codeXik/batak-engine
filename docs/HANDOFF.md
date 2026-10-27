# HANDOFF — devam kaydı

## 27 Ekim 2026 — Eksikler tamamlandı (1.2.0)

- Eklendi: kaydet/yükle, ihale ve el geçmişi, son el, sıralama, oyuncu görünümü, ayar ve dağıtım denetimi. Bilgisayar El almaz ve King diyor; El almaz hatası düzeltildi. `npm test` 24 test geçti.
- Denendi, alınmadı: zor bilgisayarın "kendi puanı yerine ötekilerden farkını" düşünmesi. Ölçümde puanı düşürdü (300 tur: 20,3'e karşı 24,1), eski hâli kaldı.
- Kural değişikliği yapılmadı. Hâlâ yok: Eşli Batak (kullanıcı kararıyla sonraya).

## 27 Ekim 2026 — El almaz, King, bütün oyun (1.1.0)

- Eklendi: El almaz, King, `BatakMatch` (bitiş puanı 51). `npm test` 19 test geçti. README Türkçesi baştan yazıldı.
- Kullanıcı kuralı: commit mesajlarına ve dosyalara codeXik dışında yazar ya da "Co-Authored-By" satırı yazılmaz.
- Sıradaki: motor yeterli sayılırsa batak98'e dönülür; batak98 motoru bu depodan kullanır.

## 27 Ekim 2026 — Depo açıldı (1.0.0)

- Motor batak98 0.3.0'dan ayrıldı (kullanıcı kararı: ad `batak-engine`, MIT, herkese açık). Kod, testler (`npm test`) ve `docs/KURALLAR.md` buraya taşındı.
- Motor burada bitirilir; bittikten sonra batak98 bu motoru kullanarak devam eder (batak98'de Hakkında ekranında motor anılır).
- Eksik: "El almaz", King ve oyun bitiş puanı (51) için motor tarafı; Eşli Batak (ilk etapta yok); bilgisayarın Web Worker içinde çalıştırılması arayüz tarafında.
