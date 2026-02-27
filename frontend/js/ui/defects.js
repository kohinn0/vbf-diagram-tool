export function initDefects() {
    const btnAddDefect = document.getElementById('btnAddDefect');
    const defectList = document.getElementById('defectList');
    if (!btnAddDefect || !defectList) return;

    btnAddDefect.addEventListener('click', () => {
        // Options listából felépítése
        let tipikusOptions = '<option value="">-- Egyedi hiba kézi bevitele --</option>';
        if (typeof window.vbfData !== 'undefined' && window.vbfData.tipikus_hibak) {
            window.vbfData.tipikus_hibak.forEach(hiba => {
                tipikusOptions += `<option value="${hiba.id}">${hiba.nev}</option>`;
            });
        }

        const defectRow = document.createElement('div');
        defectRow.className = 'defect-card';
        defectRow.innerHTML = `
            <div class="defect-details">
                <label>Válassz tipikus hibát a sablonhoz:</label>
                <select class="tpl-select">
                    ${tipikusOptions}
                </select>
                
                <label style="margin-top: 10px;">Jegyzőkönyvbe kerülő szöveg:</label>
                <textarea rows="4" class="desc-input" placeholder="Ide kerül a hiba leírása..."></textarea>
                
                <label style="margin-top: 10px;">Javasolt javítási határidő:</label>
                <select class="deadline-input">
                    <option value="Azonnali (0 nap)">Azonnali (0 nap)</option>
                    <option value="30 napon belül">30 napon belül</option>
                    <option value="90 napon belül vagy a következő karbantartáskor">90 napon belül vagy a karbantartáskor</option>
                    <option value="A következő felújításkor">A következő felújításkor</option>
                    <option value="Egyedi">Egyedi dátum</option>
                </select>
            </div>
            
            <div class="defect-location">
                <label>Szabvány hivatkozás:</label>
                <input type="text" class="standard-input" placeholder="MSZ HD 60364..." style="margin-bottom: 10px;" />
                
                <label>Pontos Helyszín (Emelet, Részleg, Vagy Eszköz):</label>
                <textarea rows="3" class="loc-input" placeholder="Pl. Földszint, Élosztó, Q2 kismegszakító..."></textarea>
            </div>
            
            <div class="defect-image">
                <label>Fotó csatolása:</label>
                <div class="image-upload-area" style="cursor:pointer;">
                    <span class="upload-txt">+ Kattints ide kép feltöltéséhez</span>
                    <img class="img-preview" src="" style="display:none; max-width: 100%; max-height: 150px; border-radius: 4px; margin-top: 10px;" />
                </div>
                <input type="file" class="photo-input" accept="image/*" style="display:none;" />
                <button type="button" class="btn btn-danger btn-small" onclick="this.closest('.defect-card').remove()" style="margin-top: 10px; width: 100%;">❌ Hiba Törlése</button>
            </div>
        `;

        defectList.appendChild(defectRow);

        // Event listener az Auto-fill funkcióhoz
        const tplSelect = defectRow.querySelector('.tpl-select');
        const descInput = defectRow.querySelector('.desc-input');
        const deadlineInput = defectRow.querySelector('.deadline-input');
        const standardInput = defectRow.querySelector('.standard-input');

        tplSelect.addEventListener('change', (e) => {
            const hibaId = e.target.value;
            if (hibaId && typeof window.vbfData !== 'undefined') {
                const hibaData = window.vbfData.tipikus_hibak.find(h => h.id === hibaId);
                if (hibaData) {
                    descInput.value = hibaData.sablon_szoveg + "\\n" + "Javasolt intézkedés: " + hibaData.javasolt_intezkedes;
                    standardInput.value = hibaData.szabvany_pont;

                    // Határidő beállítása a súlyosság alapján
                    const sulyossagObj = window.vbfData.sulyossagi_szintek[hibaData.sulyossag];
                    if (sulyossagObj && sulyossagObj.hatarido) {
                        // Keresés a select opciók között
                        const optionToSelect = Array.from(deadlineInput.options).find(opt => opt.value === sulyossagObj.hatarido || opt.text.includes(sulyossagObj.hatarido));
                        if (optionToSelect) optionToSelect.selected = true;
                    }
                }
            } else {
                descInput.value = "";
                standardInput.value = "";
            }
        });

        const uploadArea = defectRow.querySelector('.image-upload-area');
        const photoInput = defectRow.querySelector('.photo-input');
        const imgPreview = defectRow.querySelector('.img-preview');
        const uploadTxt = defectRow.querySelector('.upload-txt');

        uploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    const img = new Image();
                    img.onload = function () {
                        const canvas2 = document.createElement('canvas');
                        const ctx = canvas2.getContext('2d');
                        const MAX_WIDTH = 800; // Optimal for reports
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                        canvas2.width = width;
                        canvas2.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        // Use WebP compression instead of JPEG for much better size vs quality ratio
                        const dataUrl = canvas2.toDataURL('image/webp', 0.7);

                        imgPreview.src = dataUrl;
                        imgPreview.style.display = 'block';
                        uploadTxt.style.display = 'none';
                        defectRow.setAttribute('data-photo', dataUrl);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });

    const btnGenerateDefects = document.getElementById('btnGenerateDefects');
    if (btnGenerateDefects) {
        btnGenerateDefects.addEventListener('click', () => {
            let foundDefects = 0;

            // Segédfüggvény egy táblázat sorainak vizsgálatához
            const scanTable = (selector, extractFn) => {
                document.querySelectorAll(selector).forEach(tr => {
                    const passSelect = tr.querySelector('.meas-pass');
                    if (passSelect && passSelect.value === 'Nem') {
                        foundDefects++;
                        btnAddDefect.click();
                        const lastDefect = defectList.lastElementChild;
                        if (lastDefect) {
                            const descInput = lastDefect.querySelector('.desc-input');
                            const locInput = lastDefect.querySelector('.loc-input');
                            const stdInput = lastDefect.querySelector('.standard-input');
                            const details = extractFn(tr);
                            if (descInput) descInput.value = details.desc;
                            if (locInput) locInput.value = details.loc || '';
                            if (stdInput) stdInput.value = details.standard || '';

                            // Copy photo if attached to the measurement row
                            const attrPhoto = tr.getAttribute('data-photo');
                            if (attrPhoto) {
                                lastDefect.setAttribute('data-photo', attrPhoto);
                                const imgPreview = lastDefect.querySelector('.img-preview');
                                const uploadTxt = lastDefect.querySelector('.upload-txt');
                                if (imgPreview && uploadTxt) {
                                    imgPreview.src = attrPhoto;
                                    imgPreview.style.display = 'block';
                                    uploadTxt.style.display = 'none';
                                }
                            }
                        }
                    }
                });
            };

            // RPE Táblázat — M1 melléklet, Védővezető folytonosság
            scanTable('#table-rpe tbody tr', (tr) => {
                const loc = tr.querySelector('.meas-loc')?.value || '';
                const val = tr.querySelector('.meas-val')?.value || '';
                return {
                    desc: `A védővezető folytonossága nem megfelelő. Mért érték: ${val} Ω (Követelmény: <= 1.0 Ω). Javaslat: Kötések ellenőrzése, utánahúzása, szükség esetén a vezeték cseréje.`,
                    loc: loc,
                    standard: 'MSZ HD 60364-6:2017 §61.3.2 (Védővezető folytonosság); MEE Kézikönyv M1; 40/2017. (XII.4.) NGM 5.§'
                };
            });

            // Szigetelés Táblázat — M6 melléklet, Hálózat szigetelési ellenállás
            scanTable('#table-insulation tbody tr', (tr) => {
                const circ = tr.querySelector('.meas-circuit')?.value || '';
                const ln = tr.querySelector('.meas-ln')?.value || '';
                const lpe = tr.querySelector('.meas-lpe')?.value || '';
                const npe = tr.querySelector('.meas-npe')?.value || '';
                return {
                    desc: `Szigetelési ellenállás érték határértéken kívül. Mért értékek [MΩ]: L-N: ${ln}, L-PE: ${lpe}, N-PE: ${npe} (Követelmény: >= 1.0 MΩ, 500V DC mérőfeszültség). Javaslat: Vezetékrendszer és kötődobozok szigetelésvizsgálata, rágás/sérülés keresése.`,
                    loc: circ,
                    standard: 'MSZ HD 60364-6:2017 §61.3.3 (Szigetelési ellenállás); MEE Kézikönyv M6; TvMI 7.7:2026.02.01 §4.3'
                };
            });

            // Hurok Táblázat — M1 melléklet, Hibavédelem ellenőrzése
            scanTable('#table-loop tbody tr', (tr) => {
                const circ = tr.querySelector('.meas-circuit')?.value || '';
                const loc = tr.querySelector('.meas-loc')?.value || '';
                const device = tr.querySelector('.meas-device')?.value || '';
                const val = tr.querySelector('.meas-zs')?.value || '';
                // Számolt határérték
                const curve = device.toUpperCase().match(/[A-Z]+/)?.[0] || '';
                const In = parseFloat(device.match(/[0-9.]+/)?.[0]);
                let maxZsStr = '';
                if (curve && !isNaN(In)) {
                    let Ia = 0;
                    if (curve === 'B') Ia = In * 5;
                    else if (curve === 'C') Ia = In * 10;
                    else if (curve === 'D') Ia = In * 20;
                    if (Ia > 0) maxZsStr = ` (Határérték: Zs <= ${((230 * 0.95) / Ia).toFixed(2)} Ω, ${curve}${In}A, Ia=${Ia}A)`;
                }
                return {
                    desc: `A hurokellenállás értéke nem biztosítja a ${device} kikapcsoló szerv előírt időn belüli kioldását. Mért Zs érték: ${val} Ω${maxZsStr}. Képlet: Zs <= (U0x0.95)/Ia. Javaslat: Keresztmetszet-növelés vagy ÁVK (RCD) beépítése javasolt a kiegészítő védelemhez.`,
                    loc: `${circ} (${loc})`,
                    standard: 'MSZ HD 60364-6:2017 §61.3.6 (Hurokimpedancia); MSZ HD 60364-4-41:2017 §411.4; MEE Kézikönyv M1; 40/2017. (XII.4.) NGM 5.§'
                };
            });

            // RCD Táblázat — M5 melléklet, FI-relék (áram-védőkapcsoló)
            scanTable('#table-rcd tbody tr', (tr) => {
                const circ = tr.querySelector('.meas-circ')?.value || '';
                const idn = tr.querySelector('.meas-idn')?.value || '';
                const t1 = tr.querySelector('.meas-t1')?.value || '';
                return {
                    desc: `Az ÁVK (FI-relé) kioldási ideje vagy kioldó árama nem megfelelő. Kioldási idő (1xIdn): ${t1} ms (Követelmény: <= 300 ms általános, <= 40 ms perszonális védelem), Névleges áram: ${idn} mA. Javaslat: Az ÁVK azonnali cseréje és az áramkör felülvizsgálata!`,
                    loc: circ,
                    standard: 'MSZ HD 60364-6:2017 §61.3.7 (ÁVK vizsgálat); MSZ EN 61008-1; MEE Kézikönyv M5; TvMI 7.7:2026.02.01 §4.4'
                };
            });

            // EPH Táblázat — Egyenértékű potenciálkiegyenlítés
            scanTable('#table-eph tbody tr', (tr) => {
                const node = tr.querySelector('.meas-loc')?.value || '';
                const conn = tr.querySelector('.meas-elem')?.value || '';
                const val = tr.querySelector('.meas-val')?.value || '';
                return {
                    desc: `A ${conn} és a ${node} EPH csomópont közötti földelővezető vagy összekötő vezető folytonossága / ellenállása nem megfelelő. Mért Rpe érték: ${val} Ω. Javaslat: Földelési / EPH kötés javítása elengedhetetlen!`,
                    loc: `Csomópont: ${node}, Eszköz: ${conn}`,
                    standard: 'MSZ HD 60364-5-54:2011 §544 (EPH rendszer); MSZ HD 60364-4-41:2017 §411.3.1.2; 40/2017. (XII.4.) NGM 6.§'
                };
            });

            // Szerszám Táblázat — M3-M4 melléklet, Kéziszerszámok
            scanTable('#table-tools tbody tr', (tr) => {
                const name = tr.querySelector('.meas-name')?.value || '';
                const id = tr.querySelector('.meas-id')?.value || '';
                const val = tr.querySelector('.meas-val')?.value || '';
                return {
                    desc: `A ${name} megnevezésű kéziszerszám / berendezés szigetelési ellenállása nem megfelelő. Mért érték: ${val} MΩ (Követelmény: >= 2.0 MΩ, II. érintésvédelmi osztály). Javaslat: Eszköz javítása vagy selejtezése!`,
                    loc: `Eszköz: ${name}, Azonosító: ${id}`,
                    standard: 'MSZ EN 60745-1 (Kéziszerszámok biztonsága); MEE Kézikönyv M3-M4; MSZ 1585:2021'
                };
            });

            // SELV/PELV Táblázat — M2 melléklet, Törpefeszültség
            scanTable('#table-selv tbody tr', (tr) => {
                const loc = tr.querySelector('.meas-loc')?.value || '';
                const v = tr.querySelector('.meas-v')?.value || '';
                return {
                    desc: `SELV/PELV áramkör érintésvédelmi vagy szigetelési paraméterei nem megfelelőek. Szekunder feszültség: ${v} V (Követelmény: max. 50V AC / 120V DC). Javaslat: Biztonsági transzformátor vagy leválasztó áramkör felülvizsgálata!`,
                    loc: loc,
                    standard: 'MSZ HD 60364-4-41:2017 §414 (SELV/PELV); MSZ EN 61558-2-6 (Biztonsági transzformátorok); MEE Kézikönyv M2'
                };
            });

            if (foundDefects > 0) {
                alert(`✅ ${foundDefects} db hibát sikeresen kigyűjtöttem a mérésekből a Hibajegyzékbe! Lépj át a "Feltárt Hibák" fülre a megtekintéshez!`);
                // Navigáljunk is át a tabra
                const btnTabs = document.querySelectorAll('.nav-tab');
                btnTabs.forEach(btn => {
                    if (btn.innerText.includes('Hibajegyzék')) btn.click();
                });
            } else {
                alert(`Nincs "NEM" vagy "Piros" jelzésű mérés a táblázatokban!`);
            }
        });
    }
}
