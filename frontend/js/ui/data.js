export function initData() {
    // Központi képtömörítés feltöltés/mentés előtt (kevesebb adat, gyorsabb szinkron)
    window.VBF_compressImage = function (dataUrl, opts) {
        const maxWidth = (opts && opts.maxWidth) || 720;
        const maxHeight = (opts && opts.maxHeight) || 720;
        const quality = (opts && opts.quality) != null ? opts.quality : 0.6;
        return new Promise((resolve, reject) => {
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
                resolve(dataUrl || '');
                return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth || h > maxHeight) {
                    const r = Math.min(maxWidth / w, maxHeight / h);
                    w = Math.round(w * r);
                    h = Math.round(h * r);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(dataUrl); return; }
                ctx.drawImage(img, 0, 0, w, h);
                try {
                    const out = canvas.toDataURL('image/webp', quality);
                    resolve(out || dataUrl);
                } catch (e) {
                    try { resolve(canvas.toDataURL('image/jpeg', quality)); } catch (_) { resolve(dataUrl); }
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    };

    window.vbfData = {
        "meta": {
            "verzio": "1.0",
            "letrehozva": "2026-02-19",
            "forras": "MSZ HD 60364 szabványsorozat, 40/2017. (XII. 4.) NGM rendelet",
            "leiras": "Villamos biztonsági felülvizsgálat (VBF) és érintésvédelmi (EPH) ellenőrzések tipikus hibái és sablon szövegei"
        },

        "tipikus_hibak": [
            {
                "id": "HIBA-001",
                "nev": "Hiányzó vagy hibás FI-relé (RCD)",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "kritikus",
                "leiras": "Az áramvédő kapcsoló (FI-relé) hiányzik, nem működik megfelelően, vagy a tesztgomb megnyomáskor nem old ki. A 30mA érzékenységű RCD hiánya az érintésvédelem alapvető hiányosságát jelenti.",
                "sablon_szoveg": "A vizsgálat során megállapítást nyert, hogy a(z) {helyszin} területén üzemelő villamos berendezés érintésvédelmi áramvédő kapcsolóval (RCD) nem rendelkezik / az áramvédő kapcsoló működésképtelen állapotban van. Az MSZ HD 60364-4-41 szabvány szerinti védelem nem biztosított.",
                "javasolt_intezkedes": "30mA érzékenységű, megfelelő névleges áramú áramvédő kapcsoló (RCD) azonnali beszerelése / cseréje kötelező.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 411.3.3",
                "kepek": ["fi_rele_hianyzik", "elosztotabla_rcd_nelkul", "mukodeskeptelen_rcd"]
            },
            {
                "id": "HIBA-002",
                "nev": "Hiányzó vagy megszakadt védővezeték (PE)",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "kritikus",
                "leiras": "A védővezeték (PE) nem csatlakozik a fogyasztóhoz, megszakadt, vagy a csatlakozási pont meglazult. Ez az alapvető érintésvédelmi hiányosság közvetlen életveszélyt jelent.",
                "sablon_szoveg": "A(z) {helyszin} / {azonosito} jelű fogyasztási helyen a védővezeték (PE) folytonossága nem biztosított / a védővezeték hiányzik. A védővezető-ellenállás mért értéke: {ertek} Ω (megengedett: max. 1 Ω). Közvetlen életveszély áll fenn.",
                "javasolt_intezkedes": "A védővezeték azonnali helyreállítása, a csatlakozási pontok ellenőrzése és megfelelő rögzítése. A hiba elhárításáig a fogyasztó használata TILOS.",
                "szabvany_pont": "MSZ HD 60364-5-54:2014, 543.1",
                "kepek": ["megszakadt_vedovezetek", "lazult_pe_csatlakozo", "hianyzik_vedovezetek"]
            },
            {
                "id": "HIBA-003",
                "nev": "Szigetelési ellenállás nem megfelelő",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A vezetékek szigetelési ellenállása a mért értékek alapján nem éri el a szabványban előírt minimális értéket (általában 1 MΩ). Ez elektromos zárlat és áramütés veszélyét jelenti.",
                "sablon_szoveg": "A(z) {aramkor} áramkör szigetelési ellenállásának mért értéke: {ertek} MΩ. A megengedett minimális érték: 1 MΩ (MSZ HD 60364-6:2017, 6.4.3.3 táblázat szerint). A szigetelés nem megfelelő állapotú.",
                "javasolt_intezkedes": "A szigetelési hiba helyének megkeresése és a hibás vezetékszakasz cseréje. Nedvesség okozta hiba esetén a nedvesség forrásának megszüntetése.",
                "szabvany_pont": "MSZ HD 60364-6:2017, 6.4.3.3",
                "kepek": ["szigeteles_meres_kepernyo", "serult_kabelszigeteles", "nedves_vezetekek"]
            },
            {
                "id": "HIBA-004",
                "nev": "Nem megfelelő túláramvédelem",
                "kategoria": "tuz_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A kismegszakító vagy biztosító névleges értéke nem felel meg a vezeték megengedett terhelhetőségének. Túlméretezett védelem esetén a vezeték túlmelegedhet még mielőtt a védelem kioldana.",
                "sablon_szoveg": "A(z) {aramkor} áramkör túláramvédelme ({vedelem_tipus}, {vedelem_ertek}A) nem megfelelő a {vezetek_keresztmetszet} mm² keresztmetszetű vezetékhez. Megengedett maximális: {max_ertek}A. Az MSZ HD 60364-4-43 szabvány követelményei nem teljesülnek.",
                "javasolt_intezkedes": "A túláramvédelem cseréje a vezeték keresztmetszetének megfelelő névleges értékűre, vagy a vezeték cseréje megfelelő keresztmetszetűre.",
                "szabvany_pont": "MSZ HD 60364-4-43:2013, 433.1",
                "kepek": ["tulmertezett_kismegszakito", "elosztotabla_vedelmek", "tulhevult_vezetek"]
            },
            {
                "id": "HIBA-005",
                "nev": "Hiányzó vagy hibás érvéghüvely",
                "kategoria": "tuz_veszelye",
                "sulyossag": "kozepes",
                "leiras": "A többerű (sodrott) vezetékek végén nem található érvéghüvely, vagy az érvéghüvely nincs megfelelően préselve. Ez rossz érintkezéshez, ívképződéshez és tűzveszélyhez vezethet.",
                "sablon_szoveg": "A(z) {helyszin} területén található villamos berendezésben a többerű (sodrott) vezetékek végződéseinél érvéghüvely alkalmazása nem történt meg / az érvéghüvely nem megfelelően rögzített. Tűzveszélyes állapot.",
                "javasolt_intezkedes": "Megfelelő méretű érvéghüvelyek felszerelése és szakszerű préselése minden sodrott vezetékvégen.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 526.1",
                "kepek": ["hianyzik_erveghuely", "rossz_prezeles", "megfelelő_erveghuely"]
            },
            {
                "id": "HIBA-006",
                "nev": "Szabványtalan vezetékszín-jelölés",
                "kategoria": "szabvanytalan_allapot",
                "sulyossag": "kozepes",
                "leiras": "A vezetékek színjelölése nem felel meg az MSZ HD 60364 szabványnak. A védővezeték (zöld-sárga), a nullavezeték (kék) és a fázisvezetékek (barna, fekete, szürke) színe nem azonosítható egyértelműen.",
                "sablon_szoveg": "A(z) {helyszin} villamos hálózatán a vezetékek színjelölése nem felel meg az MSZ HD 60364-5-51:2017 szabvány 514.3 pontjában előírtaknak. Félreértésre és balesetveszélyre ad lehetőséget.",
                "javasolt_intezkedes": "A nem szabványos színjelölésű vezetékek jelölése megfelelő színű zsugórcsővel vagy jelölőgyűrűvel, vagy a vezetékek cseréje.",
                "szabvany_pont": "MSZ HD 60364-5-51:2017, 514.3",
                "kepek": ["rossz_szinjeloles", "zavaros_vezetekek", "szabvanyos_szinjeloles"]
            },
            {
                "id": "HIBA-007",
                "nev": "Alumínium és réz vezeték közvetlen érintkezése",
                "kategoria": "tuz_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A réz és alumínium vezetékek közvetlenül érintkeznek, megfelelő összekötő elem (pl. bimetál saruval) használata nélkül. Az elektrokémiai oxidáció fokozott átmeneti ellenállást és tűzveszélyt okoz.",
                "sablon_szoveg": "A(z) {helyszin} villamos berendezésében alumínium és réz vezeték közvetlen kontaktusban van speciális összekötő elem alkalmazása nélkül. Az elektrokémiai korrózió miatt fokozott tűzveszély áll fenn.",
                "javasolt_intezkedes": "Bimetál saruval vagy speciális összekötő elemmel történő újrabekötés, vagy az alumínium vezetékszakasz cseréje réz vezetékre.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 526.2",
                "kepek": ["al_cu_kozvetlen_kotés", "oxidalodott_csatlakozo", "bimetall_saru"]
            },
            {
                "id": "HIBA-008",
                "nev": "Hiányzó vagy sérült burkolat/fedél",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A villamos berendezés burkolata hiányzik, megsérült vagy nem zárható megfelelően, így az aktív (feszültség alatt lévő) részek hozzáférhetővé válnak.",
                "sablon_szoveg": "A(z) {berendezes} villamos berendezés burkolata sérült / hiányzik / nem zárható megfelelően. Az aktív részek védelme nem biztosított, az MSZ HD 60364-4-41 szabvány 416. pontja szerinti védelem nem teljesül.",
                "javasolt_intezkedes": "A sérült burkolat azonnali javítása vagy cseréje. A hiányzó fedél pótlása. A hiba elhárításáig a berendezés használata TILOS.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 416",
                "kepek": ["serult_burkolat", "hianyzik_fedel", "hozzaferheto_aktiv_reszek"]
            },
            {
                "id": "HIBA-009",
                "nev": "Túlterhelt csatlakozási pont",
                "kategoria": "tuz_veszelye",
                "sulyossag": "sulyos",
                "leiras": "Egy csatlakozási ponton több vezeték van bekötve, mint amennyi megengedett, vagy a csatlakozási pont túlterheltsége miatt felmelegedés tapasztalható.",
                "sablon_szoveg": "A(z) {helyszin} elosztóban a(z) {csatlakozo} csatlakozási pont túlterhelt: {vezetek_db} db vezeték bekötve a megengedett {max_db} helyett. Túlmelegedés / égésnyomok észlelhetők. Fokozott tűzveszély.",
                "javasolt_intezkedes": "A túlterhelt csatlakozási pont tehermentesítése, szükség esetén további sorkapcsok beépítése. Az érintett vezetékek és csatlakozások ellenőrzése, szükség esetén cseréje.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 526.3",
                "kepek": ["tulterhelt_sorkapocs", "felmelegedett_csatlakozo", "egesnyom_kapcson"]
            },
            {
                "id": "HIBA-010",
                "nev": "Nem megfelelő IP védettség",
                "kategoria": "szabvanytalan_allapot",
                "sulyossag": "kozepes",
                "leiras": "A villamos berendezés IP (Ingress Protection) védettségi fokozata nem megfelelő a telepítési helyszínnek. Például vizes helyiségben IP20-as berendezés található.",
                "sablon_szoveg": "A(z) {helyszin} területén telepített {berendezes} villamos berendezés IP védettségi fokozata ({aktualis_ip}) nem felel meg a helyszín követelményeinek (elvárt: {elvart_ip}). Az MSZ HD 60364-5-51:2017 szabvány 512.2 pontjának követelményei nem teljesülnek.",
                "javasolt_intezkedes": "A nem megfelelő IP védettségű berendezés cseréje a helyszínnek megfelelő védettségű berendezésre.",
                "szabvany_pont": "MSZ HD 60364-5-51:2017, 512.2",
                "kepek": ["nem_megfelelo_ip_furdoszoba", "vedett_kulteri_lampa", "ip_jeloles"]
            },
            {
                "id": "HIBA-011",
                "nev": "Hiányzó vagy elavult dokumentáció",
                "kategoria": "szabvanytalan_allapot",
                "sulyossag": "enyhe",
                "leiras": "A villamos berendezés áramköri rajza, kapcsolási vázlata vagy egyéb dokumentációja hiányzik, elavult vagy nem felel meg a tényleges állapotnak.",
                "sablon_szoveg": "A(z) {helyszin} villamos berendezéséhez tartozó műszaki dokumentáció (áramköri rajz, kapcsolási vázlat) nem áll rendelkezésre / elavult / nem felel meg a tényleges állapotnak. Az MSZ HD 60364-6:2017 szabvány 6.4.2.1 pontja szerinti ellenőrzés csak korlátozottan végezhető el.",
                "javasolt_intezkedes": "A villamos hálózat felmérése és új, naprakész dokumentáció készítése. Az elosztóban lévő áramkörök egyértelmű jelölése.",
                "szabvany_pont": "MSZ HD 60364-6:2017, 6.4.2.1",
                "kepek": ["jeloletlen_elosztotabla", "elavult_rajz", "megfelelo_dokumentacio"]
            },
            {
                "id": "HIBA-012",
                "nev": "Csavart/forrasztott vezetékkötés",
                "kategoria": "tuz_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A vezetékek csavart vagy forrasztott kötéssel vannak összekötve, kötődoboz és megfelelő sorkapocs használata nélkül. Ez megbízhatatlan kötést és tűzveszélyt jelent.",
                "sablon_szoveg": "A(z) {helyszin} villamos hálózatán szabványtalan vezetékkötés található: csavart/forrasztott kötés kötődoboz nélkül. Az MSZ HD 60364-5-52:2014 szabvány 526.4 pontja szerinti követelmények nem teljesülnek. Fokozott tűzveszély.",
                "javasolt_intezkedes": "Az összes csavart/forrasztott kötés megszüntetése. Kötődobozok beépítése és megfelelő sorkapcsok vagy WAGO-típusú összekötők alkalmazása.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 526.4",
                "kepek": ["csavart_kotes", "forrasztott_kotes", "szabvanyos_kotodoba"]
            },
            {
                "id": "HIBA-013",
                "nev": "Hurokimpedancia nem megfelelő",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A mért hurokimpedancia értéke meghaladja a megengedett maximumot, így zárlat esetén a védelem nem tudja biztosítani az előírt kikapcsolási időt.",
                "sablon_szoveg": "A(z) {aramkor} áramkör hurokimpedanciájának mért értéke: {ertek} Ω. A megengedett maximális érték a {vedelem} védelemmel és {feszultseg}V feszültséggel: {max_ertek} Ω. Az automatikus lekapcsolással történő védelem az MSZ HD 60364-4-41:2017 szabvány 411.4 pontja szerint nem biztosított.",
                "javasolt_intezkedes": "A hurokimpedancia csökkentése: rövidebb vezetékhossz, nagyobb keresztmetszetű vezeték, vagy a földelés javítása.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 411.4",
                "kepek": ["hurokimpedancia_meres", "elosztotabla_vedelmek", "meresi_eredmeny"]
            },
            {
                "id": "HIBA-014",
                "nev": "Meglazult csatlakozások",
                "kategoria": "tuz_veszelye",
                "sulyossag": "kozepes",
                "leiras": "A csatlakozási pontok meglazultak, a csavarok nem megfelelő nyomatékkal vannak meghúzva. Ez megnövekedett átmeneti ellenálláshoz és túlmelegedéshez vezet.",
                "sablon_szoveg": "A(z) {helyszin} elosztóban / csatlakozási pontokon meglazult kötések találhatók. A csatlakozások hőmérséklete emelkedett / égésnyomok láthatók. Fokozott tűzveszély áll fenn.",
                "javasolt_intezkedes": "Minden csatlakozási pont ellenőrzése és megfelelő nyomatékkal történő meghúzása. Sérült sorkapcsok, csatlakozók cseréje.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 526.1",
                "kepek": ["lazult_csatlakozo", "egett_sorkapocs", "termokameras_felvetel"]
            },
            {
                "id": "HIBA-015",
                "nev": "Főelosztó EPH kötés hiánya",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "kritikus",
                "leiras": "A főelosztónál az egyenpotenciálra hozás (EPH) nem megfelelő: a fém csőrendszerek (víz, gáz, fűtés) nincsenek bekötve a főföldvezetékbe.",
                "sablon_szoveg": "A(z) {helyszin} főelosztójánál a fő egyenpotenciálra hozás (EPH) nem megfelelő / hiányos. A következő vezetőképes rendszerek nincsenek bekötve: {rendszerek}. Az MSZ HD 60364-4-41:2017 szabvány 411.3.1.2 pontja szerinti védelem nem biztosított.",
                "javasolt_intezkedes": "Az összes vezetőképes rendszer (fém vízvezeték, gázvezeték, fűtéscsövek, szerkezeti fémek) bekötése a főföldvezetékbe megfelelő keresztmetszetű EPH vezetékkel.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 411.3.1.2",
                "kepek": ["hianyos_eph_kotes", "foelosztoi_eph_sin", "megfelelo_eph"]
            },
            {
                "id": "HIBA-016",
                "nev": "Elavult alumínium vezetékezés",
                "kategoria": "tuz_veszelye",
                "sulyossag": "kozepes",
                "leiras": "A régi, általában panelépületekben található alumínium vezetékezés oxidálódott, törékennyé vált. A csatlakozási pontoknál fokozott az átmeneti ellenállás és a tűzveszély.",
                "sablon_szoveg": "A(z) {helyszin} villamos hálózata elavult alumínium vezetékezéssel rendelkezik. A vezetékek törékenyek, oxidálódtak, a csatlakozási pontoknál megnövekedett átmeneti ellenállás mérhető. A hálózat felújítása szükséges.",
                "javasolt_intezkedes": "Hosszú távon a teljes hálózat cseréje réz vezetékekre. Rövid távon a csatlakozási pontok felülvizsgálata, speciális alumínium-kompatibilis sorkapcsok alkalmazása.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 523.9",
                "kepek": ["elavult_al_vezetek", "oxidalt_csatlakozo", "torott_al_vezetek"]
            },
            {
                "id": "HIBA-017",
                "nev": "Aljzatok védőérintkezőjének hiánya vagy sérülése",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "kritikus",
                "leiras": "A csatlakozóaljzat (dugalj) védőérintkezője letört, elhajlott vagy eleve nincs bekötve a védővezetőbe. Ez a hiba megszünteti a rácsatlakoztatott készülék I. érintésvédelmi osztályú védelmét.",
                "sablon_szoveg": "A(z) {helyszin} védőérintkezős dugaszolóaljzatainak védőérintkezője sérült/eltört/hiányzik. A rácsatlakoztatott fogyasztók érintésvédelme nem biztosított (MSZ HD 60364-4-41:2017 előírásai szerint). Közvetlen áramütés veszély.",
                "javasolt_intezkedes": "A meghibásodott vagy hiányzó dugaszolóaljzatok azonnali cseréje új, megfelelő védőérintkezős típusokra.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 411.3",
                "kepek": ["torott_vedoerintkezo", "dugalj_hiba"]
            },
            {
                "id": "HIBA-018",
                "nev": "Fürdőkád / zuhanytálca EPH bekötés hiánya",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A fürdőszobában található fémes fürdőkád vagy zuhanytálca nincs bevonva a kiegészítő egyenpotenciálra hozó hálózatba.",
                "sablon_szoveg": "A(z) {helyszin} (fürdőszoba) területén a fémes fürdőkád/zuhanytálca kiegészítő EPH bekötése hiányzik. Az MSZ HD 60364-7-701:2007 szabvány követelménye nem teljesül.",
                "javasolt_intezkedes": "A szerkezeti részek megfelelő keresztmetszetű rézvezetővel (min. 4mm² vagy 2,5mm² mechanikai védelemmel) történő bekötése a helyi EPH csomópontba.",
                "szabvany_pont": "MSZ HD 60364-7-701:2007, 701.415.2",
                "kepek": ["furdokad_eph", "hianyzo_vedovezetok"]
            },
            {
                "id": "HIBA-019",
                "nev": "Túlfeszültség-levezető (SPD) hiánya, vagy hibajelzése",
                "kategoria": "tulferzultseg_veszely",
                "sulyossag": "kozepes",
                "leiras": "A villamos hálózat bevezetésénél nincs beépítve túlfeszültség-levezető, vagy a meglévő készülék állapoteleme 'piros' (tönkrement) jelzést mutat.",
                "sablon_szoveg": "A(z) {helyszin} főelosztójában a túlfeszültség-védelmi eszköz (SPD) hiányzik / hibajelzést (piros) mutat, így feladatát nem képes ellátni. Az MSZ HD 60364-4-443 szabvány feltételei alapján pótlása javasolt.",
                "javasolt_intezkedes": "Megfelelő T1/T2 osztályú túlfeszültség-levezető beépítése vagy a hibás (kioldott) patron/modul cseréje.",
                "szabvany_pont": "MSZ HD 60364-4-443:2016, 443.4",
                "kepek": ["spd_hiba", "piros_spd"]
            },
            {
                "id": "HIBA-020",
                "nev": "Falon kívüli vezeték mechanikai védelem nélkül",
                "kategoria": "szabvanytalan_allapot",
                "sulyossag": "kozepes",
                "leiras": "Szigetelt vezetékek (pl. MBCU) falon kívül futnak megfelelő kábelcsatorna, védőcső vagy fizikai burkolat nélkül olyan helyen, ahol fizikai sérülés érheti őket.",
                "sablon_szoveg": "A(z) {helyszin} területén a villamos vezetékek mechanikai védelem (kábelcsatorna, védőcső) nélkül kerültek falon kívül elhelyezésre, olyan magasságban/helyzetben, ami sérülésveszélyes. Az MSZ HD 60364-5-52:2014 előírásai nem érvényesülnek.",
                "javasolt_intezkedes": "A vezetékszakasz megfelelő műanyag csatornába (pvc) vagy védőcsőbe történő helyezése a mechanikai sérülések elkerülése érdekében.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 522.6",
                "kepek": ["vedetlen_kabel", "lengo_vezetek"]
            },
            {
                "id": "HIBA-021",
                "nev": "Elosztóberendezés érintésvédelmi fedelének (maszkjának) hiánya",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A biztosítéktáblán vagy kapcsolószekrényben hiányzik a takarólemez (maszk) a kismegszakítók/sorozatkapcsok elől, ezáltal a feszültség alatti részek szabadon, ujj-jal megérinthetőek.",
                "sablon_szoveg": "A(z) {helyszin} címen lévő fő/alelosztó maszkolja (takarófedele) hiányzik. Az MSZ HD 60364-4-41 szabvány szerinti alapvédelem nem biztosított (IP2X / IPXXB feltétel sérül).",
                "javasolt_intezkedes": "Az elosztódoboz specifikus takarólemezének pótlása, vagy ha ez nem lehetséges, a teljes elosztódoboz cseréje új típusúra.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 416.2",
                "kepek": ["eloszto_maszk_nelkul", "aramutesveszely_eloszto"]
            },
            {
                "id": "HIBA-022",
                "nev": "Flexibilis vezeték fix bekötése éles/fém peremen átvezetve",
                "kategoria": "tuz_veszelye",
                "sulyossag": "sulyos",
                "leiras": "Mozgatható vagy flexibilis vezeték (pl. hosszabbító, MT kábel) fix fém peremen, éles felületen van átvezetve tömszelence vagy szigetelő védőcső használata nélkül.",
                "sablon_szoveg": "A(z) {helyszin} területén a vezeték átvezetése éles fém/kő peremenél megfelelő védőhüvely vagy tömszelence nélkül történt. A szigetelés sérülésének / átvágásának veszélye fennáll.",
                "javasolt_intezkedes": "Gumigyűrűs átvezető (grommet), tömszelence beépítése vagy a vezeték átvezetési útvonalának védőcsővel történő biztosítása.",
                "szabvany_pont": "MSZ HD 60364-5-52:2014, 522.8",
                "kepek": ["eles_peremen_kabel", "tomszelence_hianya"]
            },
            {
                "id": "HIBA-023",
                "nev": "Világítótestek nem megfelelő mennyezeti rögzítése",
                "kategoria": "mechanikai_veszely",
                "sulyossag": "kozepes",
                "leiras": "A lámpatest nincs megfelelően tehermentesítve vagy felerősítve a mennyezetre, kizárólag a villamos bekötő vezetéken (sorkapcson) lóg.",
                "sablon_szoveg": "A(z) {helyszin} helyiségben elhelyezett világítótest szerelése nem szakszerű, a rögzítés hiányában a szerelvény saját súlyát az elektromos vezetékek tartják. Leszakadás és zárlat veszély!",
                "javasolt_intezkedes": "Lámpatest azonnali, mechanikailag is megfelelő, tehermentesítő felerősítése a szerkezeti alap(ok)hoz, tiplivel vagy más teherbíró elemmel.",
                "szabvany_pont": "MSZ HD 60364-5-55:2011, 559.5.1",
                "kepek": ["logo_lampa", "tehermentesites_hianya"]
            },
            {
                "id": "HIBA-024",
                "nev": "Többszörös (sorba kötött) hosszabbítók, elosztósorok",
                "kategoria": "tuz_veszelye",
                "sulyossag": "kozepes",
                "leiras": "Egy mobil elosztósort egy másikba, esetleg egy harmadikba dugtak be (daisy-chaining), ami a hurkok és az átmeneti ellenállás növekedése miatt melegedéshez (tűzhöz) vezethet.",
                "sablon_szoveg": "A(z) {helyszin} területén egymásba fűzött (sorba kötött) elosztósorok (hosszabbítók) használata tapasztalható. A megengedettnél magasabb hurokellenállás és a tűzveszély (túlterhelés) kockázata miatt használatuk szabványtalan.",
                "javasolt_intezkedes": "A sorba fűzött hosszabbítók megszüntetése, szükség esetén új fix, falba/szerelvénydobozba szerelt végponti dugaljak kiépítése.",
                "szabvany_pont": "MSZ HD 60364-4-42:2011, 422.3",
                "kepek": ["egymasba_dugott_elosztok", "tulterhelt_konnektor"]
            },
            {
                "id": "HIBA-025",
                "nev": "ÁVK (RCD) kioldási idő túl nagy",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "Az áramvédő kapcsoló (FI-relé) mért kioldási ideje meghaladja az MSZ HD 60364-4-41 és az MSZ EN 61008 előírt maximális értéket (általános védelem: 300 ms, perszonális: 40 ms 1×Idn esetén).",
                "sablon_szoveg": "A(z) {aramkor} áramkörön beépített ÁVK (FI-relé) kioldási ideje (1×Idn): {t1} ms. A megengedett maximum általános védelemnél 300 ms, perszonális védelemnél 40 ms (MSZ HD 60364-4-41:2017, 411.4.5). A mért érték nem megfelelő.",
                "javasolt_intezkedes": "Az ÁVK működésének ellenőrzése, szükség esetén cseréje megfelelő gyorsaságú, típushelyes készülékre.",
                "szabvany_pont": "MSZ HD 60364-4-41:2017, 411.4.5; MSZ EN 61008-1",
                "kepek": ["rcd_meres_ido", "rcd_kioldas"]
            },
            {
                "id": "HIBA-026",
                "nev": "EPH (egyenpotenciálra hozás) ellenállás túl magas",
                "kategoria": "aramutes_veszelye",
                "sulyossag": "sulyos",
                "leiras": "A főföldvezető és a vezetőképes külső részek (víz-, gáz-, fűtéscső) közötti EPH ellenállás mért értéke meghaladja a megengedett maximumot, így zárlat esetén a feszültség nem csökken kellő mértékben.",
                "sablon_szoveg": "A(z) {helyszin} főelosztójánál a fő EPH csomópont és a(z) {rendszer} közötti ellenállás mért értéke: {ertek} Ω. A megengedett maximális érték 0,2 Ω (MSZ HD 60364-5-54:2011, 544.1.2). Az egyenpotenciálra hozás nem megfelelő.",
                "javasolt_intezkedes": "Az EPH bekötések ellenőrzése, meglazult csatlakozások meghúzása, szükség esetén a földelővezető keresztmetszetének növelése vagy a bekötési pont javítása.",
                "szabvany_pont": "MSZ HD 60364-5-54:2011, 544.1.2; 40/2017. (XII. 4.) NGM 6. §",
                "kepek": ["eph_meres", "eph_csomopont"]
            }
        ],

        "sablon_szovegek": {
            "bevezetes_eloszovak": [
                {
                    "id": "BEV-001",
                    "nev": "Általános bevezetés - időszakos felülvizsgálat",
                    "szoveg": "Jelen jegyzőkönyv a(z) {megrendelo_neve} megrendelésére, a(z) {cim} címen található villamos berendezés időszakos biztonsági felülvizsgálatának eredményeit tartalmazza. A felülvizsgálat az MSZ HD 60364-6:2017, valamint a 40/2017. (XII. 4.) NGM rendelet előírásai alapján történt."
                },
                {
                    "id": "BEV-002",
                    "nev": "Bevezetés - első felülvizsgálat (üzembe helyezés előtt)",
                    "szoveg": "Jelen jegyzőkönyv a(z) {cim} címen újonnan létesült / bővített / átalakított villamos berendezés üzembe helyezés előtti első felülvizsgálatának eredményeit tartalmazza. A felülvizsgálat célja annak megállapítása, hogy a villamos berendezés megfelel-e az MSZ HD 60364 szabványsorozat és a vonatkozó jogszabályok követelményeinek."
                },
                {
                    "id": "BEV-003",
                    "nev": "Bevezetés - ingatlan adásvétel/bérbeadás",
                    "szoveg": "Jelen jegyzőkönyv a(z) {cim} címen található ingatlan villamos berendezésének adásvétel / bérbeadás előtti kötelező biztonsági felülvizsgálatának eredményeit tartalmazza, a 40/2017. (XII. 4.) NGM rendelet 12. § (2) bekezdésének megfelelően."
                }
            ],
            "vizsgalat_modszere": [
                {
                    "id": "MOD-001",
                    "nev": "Vizsgálati módszerek - teljes",
                    "szoveg": "A felülvizsgálat az alábbi vizsgálati módszerekkel történt:\n\n1. Szemrevételezéses vizsgálat: A villamos berendezés látható részeinek, szerelési állapotának, jelöléseinek vizsgálata feszültségmentes és feszültség alatti állapotban.\n\n2. Műszeres mérések:\n- Védővezető folytonosság mérése\n- Szigetelési ellenállás mérése\n- Hurokimpedancia mérése\n- RCD (áramvédő kapcsoló) működésének ellenőrzése\n- Fázissorrend vizsgálata\n\nAlkalmazott mérőműszerek: {muszer_tipus}, gyári szám: {gyari_szam}, kalibrálás érvényessége: {kalibralas_ervenyes}"
                },
                {
                    "id": "MOD-002",
                    "nev": "Vizsgálati módszerek - egyszerűsített",
                    "szoveg": "A felülvizsgálat szemrevételezéses vizsgálatból és műszeres mérésekből állt, az MSZ HD 60364-6:2017 szabvány előírásai szerint. A mérésekhez használt műszer: {muszer_tipus}, kalibrálva: {kalibralas_datum}."
                }
            ],
            "altalanos_megallapitasok": [
                {
                    "id": "MEG-001",
                    "nev": "Megfelelt minősítés",
                    "szoveg": "A vizsgált villamos berendezés érintésvédelmi szempontból MEGFELELT minősítésű. Az MSZ HD 60364 szabványsorozat és a 40/2017. (XII. 4.) NGM rendelet követelményeinek megfelel. A berendezés üzemeltetése az érvényességi időn belül folytatható."
                },
                {
                    "id": "MEG-002",
                    "nev": "Nem felelt meg minősítés",
                    "szoveg": "A vizsgált villamos berendezés érintésvédelmi szempontból NEM FELELT MEG minősítésű. A jegyzőkönyv hibajegyzék mellékletében felsorolt hiányosságok miatt a berendezés nem felel meg az MSZ HD 60364 szabványsorozat és a vonatkozó jogszabályok követelményeinek. A hibák kijavításáig a berendezés üzemeltetése NEM AJÁNLOTT / TILOS."
                },
                {
                    "id": "MEG-003",
                    "nev": "Feltételesen megfelelt",
                    "szoveg": "A vizsgált villamos berendezés érintésvédelmi szempontból FELTÉTELESEN MEGFELELT minősítésű. A hibajegyzékben felsorolt kisebb hiányosságok ellenére közvetlen életveszély nem áll fenn. A hibák javítása a következő időszakos felülvizsgálatig / a megjelölt határidőig elvégzendő."
                }
            ],
            "zaro_megjegyzesek": [
                {
                    "id": "ZAR-001",
                    "nev": "Általános záradék",
                    "szoveg": "A jegyzőkönyv a kiállítás napjától számított {ev} évig érvényes. A következő időszakos felülvizsgálat legkésőbbi időpontja: {kovetkezo_datum}. A jegyzőkönyv érvényét veszti, ha a villamos berendezésen bármilyen bővítés, átalakítás, javítás történik."
                },
                {
                    "id": "ZAR-002",
                    "nev": "Záradék hibával",
                    "szoveg": "A hibajegyzékben feltüntetett hiányosságok kijavítását követően utóellenőrzés szükséges. A hibajavítás dokumentálása a jegyzőkönyv M1 mellékletében történik. A végleges MEGFELELT minősítés csak a hibák kijavítása és ellenőrzése után adható ki."
                }
            ],
            "jogi_nyilatkozatok": [
                {
                    "id": "JOG-001",
                    "nev": "Felülvizsgáló nyilatkozata",
                    "szoveg": "Alulírott nyilatkozom, hogy a felülvizsgálatot a vonatkozó jogszabályok és szabványok előírásai szerint végeztem. A méréseket hitelesített mérőműszerrel hajtottam végre. A jegyzőkönyvben rögzített megállapítások a vizsgálat időpontjában fennálló állapotot tükrözik."
                },
                {
                    "id": "JOG-002",
                    "nev": "Üzemeltető felelőssége",
                    "szoveg": "A villamos berendezés üzemeltetője felelős a berendezés rendeltetésszerű használatáért, a feltárt hibák kijavításáért és a következő időszakos felülvizsgálat határidőben történő elvégeztetéséért. Az üzemeltetőnek biztosítania kell, hogy a villamos berendezésen csak szakképzett villanyszerelő végezzen bármilyen munkát."
                },
                {
                    "id": "JOG-003",
                    "nev": "Kritikus hiba figyelmeztetés",
                    "szoveg": "FIGYELMEZTETÉS: A jegyzőkönyvben 'kritikus' súlyosságúként megjelölt hibák közvetlen életveszélyt és/vagy fokozott tűzveszélyt jelentenek. Ezen hibák azonnali kijavítása kötelező. A hibák kijavításáig az érintett áramkörök, berendezések üzemeltetése TILOS. Az üzemeltető tudomásul veszi, hogy a figyelmeztetés ellenére történő üzemeltetés esetén a felelősség őt terheli."
                }
            ]
        },

        "sulyossagi_szintek": {
            "kritikus": {
                "nev": "Kritikus",
                "szin": "#EF4444",
                "leiras": "Közvetlen életveszélyt és/vagy fokozott tűzveszélyt jelent. Azonnali beavatkozás szükséges, a berendezés üzemeltetése TILOS.",
                "hatarido": "Azonnali (0 nap)"
            },
            "sulyos": {
                "nev": "Súlyos",
                "szin": "#F97316",
                "leiras": "Jelentős biztonsági kockázatot jelent. Soron kívüli javítás szükséges.",
                "hatarido": "30 napon belül"
            },
            "kozepes": {
                "nev": "Közepes",
                "szin": "#EAB308",
                "leiras": "Biztonsági kockázatot jelenthet. A következő karbantartáskor javítandó.",
                "hatarido": "90 napon belül vagy a következő karbantartáskor"
            },
            "enyhe": {
                "nev": "Enyhe",
                "szin": "#10B981",
                "leiras": "Szabványossági eltérés, közvetlen veszély nem áll fenn. A következő felújításkor javítandó.",
                "hatarido": "A következő felújításkor"
            }
        },

        "aramkor_nevek": [
            "Világítás (Nappali / Szoba)",
            "Világítás (Fürdő / Vizesblokk)",
            "Világítás (Konyha)",
            "Világítás (Kültér / Terasz)",
            "Dugalj (Nappali / Szoba)",
            "Dugalj (Konyha pult)",
            "Dugalj (Fürdőszoba)",
            "Sütő / Főzőlap",
            "Mosógép / Szárítógép",
            "Mosogatógép",
            "Klíma / Hőszivattyú",
            "Kazán / Fűtés",
            "Villanybojler / Vízmelegítő",
            "Riasztó / Kamera / Gyengeáram",
            "Gázkazán EPH dugalj",
            "Kert / Kapunyitó / Garázs",
            "Szauna / Jakuzzi",
            "Napelem Inverter",
        ]
    };
}
