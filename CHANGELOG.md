# Değişiklik kaydı

## 1.3.0 — 27 Ekim 2026

- Yeni: çevrim içi oyun için tek giriş noktası `act(koltuk, hamle)`; hiç hata fırlatmaz, hata kodu döner.
- Yeni: hamle numarası (`seq`) ve son hamle (`lastAction`); geç kalan ya da iki kez gelen hamle reddedilir.
- Yeni: `expects(koltuk)`, `botAction` (bilgisayar hamlesini yapmadan verir), bütün oyun için `view(koltuk)`.
- Yeni: kartlar varsayılan olarak güvenli (şifreleme düzeyinde) rastgeleyle karıştırılır; `secureRandom` dışa açıldı.
- Yeni: kayıt yüklenirken tutarlılık denetimi (aşama, sıra, el sayıları, oynanan kartlar).
- Kural değişikliği yok.

## 1.2.0 — 27 Ekim 2026

- Yeni: kaydetme ve yükleme (`toJSON` / `fromJSON`, hem tur hem bütün oyun); bozuk kayıt yüklenmez.
- Yeni: ihale geçmişi (`auction`), biten eller (`history`), son el (`lastTrick`), oyun sıralaması (`standings`), tur özetinde koz ve El almaz.
- Yeni: oyuncu görünümü `view(koltuk)` (rakiplerin kartları gizli).
- Yeni: yanlış ayar, yanlış dağıtım ve yanlış dağıtıcı numarası hata verir.
- Düzeltme: El almaz diyen bilgisayar el almaya çalışıyordu; artık hiç el almamaya çalışır, ötekiler de onun aldığı ele karışmaz.
- Yeni: bilgisayar (normal, zor) uygun elle El almaz ve King der.
- Düzeltme: turun kopyasında King'in tutup tutmadığı bilgisi kayboluyordu.
- Kural değişikliği yok.

## 1.1.0 — 27 Ekim 2026

- Yeni: `BatakMatch` (bütün oyun: bitiş puanına kadar turlar, dağıtıcı sırayla ilerler, eşitlikte bir tur daha).
- Yeni ayarlar: `elAlmaz` / `elAlmazPoints` ("El almaz" ilanı, +50 / −50) ve `king` (13 el ilanı, tutarsa oyunu kazanır). Varsayılan kapalı.
- README baştan, düzgün Türkçeyle yazıldı.

## 1.0.0 — 27 Ekim 2026

- İlk yayın: batak98 projesinden ayrılan motor (batak98 0.3.0). Kural motoru (dağıtım, ihale, koz, kart denetimi, el kazananı, iki puanlama sistemi), bilgisayar oyuncusu (kolay, normal, zor) ve testler.
