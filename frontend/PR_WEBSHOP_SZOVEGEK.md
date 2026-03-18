# Pull Request: Webshop reklám és leírás szövegek (index.html)

## Cím (Title)

```
Webshop: reklám és leírás szövegek frissítése (index.html)
```

## Leírás (Description)

A **főoldal (index.html)** webshop és reklám szekcióinak szövegeinek frissítése, egységesítése vagy bővítése. A változtatások csak a látható copy-t érintik (hero, Rólunk, Hogyan Működik, Funkciók, Árazás, Partnerek, Szakemberek, GYIK, Kapcsolat, kosár üzenetek).

### Szövegek referenciája

A jelenlegi és a módosított szövegek áttekinthetők a **`frontend/WEBSHOP_SZOVEGEK.md`** fájlban (section–mező táblázatok). A PR során érdemes ott is jelezni, mely blokkok változtak.

### Típusos változtatások (példák)

- [ ] **Hero:** főcím, alcím, figyelmeztetés szöveg, CTA gombok szövege
- [ ] **Rólunk:** „Miért jött létre” bekezdések
- [ ] **Hogyan Működik:** lépések címei és rövid leírásai
- [ ] **Funkciók:** kártyák címei és leírásai (Rajzoló, Metrel, Auto-Hiba, Céges, QR, Munkakiosztás)
- [ ] **Webshop & Előfizetés:** szekció címe, alcím, árazás leírás, csomagnevek, feature listák, láb szöveg
- [ ] **Partnerek / Szakemberek:** szekció szövegei, partner kártya leírások
- [ ] **GYIK:** kérdések vagy válaszok módosítása / bővítése
- [ ] **Kapcsolat:** rövid bevezető szöveg
- [ ] **Kosár / fizetés:** üres kosár üzenet, regisztráció szöveg, sikeres vásárlás üzenet

### Fájlok

| Fájl | Változás |
|------|----------|
| **index.html** | Hero, About, How it works, Features, Shop (árazás), Partners, Experts, FAQ, Contact és kosár panel szövegei. |
| **WEBSHOP_SZOVEGEK.md** | (Opcionális) Referencia doc frissítése az új szövegekkel. |

### Tesztelés

- [ ] index.html megnyitása böngészőben
- [ ] Hero, Rólunk, Hogyan Működik, Funkciók, Árazás szekciók szövegei helyesen jelennek meg
- [ ] Kosár panel: üres üzenet, checkout lépés szövegei
- [ ] Mobil nézetben is ellenőrizve (rövid szövegek, sortörések)

### Kapcsolódó

- Szövegek összesítése: `frontend/WEBSHOP_SZOVEGEK.md`
