export function initAdmin() {
    window.fetchCompanySettings = async function () {
        try {
            const res = await fetch(`${window.API_BASE_URL}/admin/company`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('adminCompName').value = data.company_name || '';
                document.getElementById('adminCompTax').value = data.tax_number || '';
                document.getElementById('adminCompAddress').value = data.address || '';
                document.getElementById('adminCompBank').value = data.bank_account || '';

                if (data.logo_path) {
                    const img = document.getElementById('adminCompLogoPreview');
                    img.src = `${window.API_BASE_URL.replace('/api', '')}/${data.logo_path}`;
                    img.style.display = 'block';
                }
            }
        } catch (e) {
            console.error("Nem sikerült betölteni a céges adatokat", e);
        }
    };

    const btnAdminSaveCompany = document.getElementById('btnAdminSaveCompany');
    if (btnAdminSaveCompany) {
        btnAdminSaveCompany.addEventListener('click', async () => {
            const data = {
                company_name: document.getElementById('adminCompName').value,
                tax_number: document.getElementById('adminCompTax').value,
                address: document.getElementById('adminCompAddress').value,
                bank_account: document.getElementById('adminCompBank').value
            };
            try {
                const res = await fetch(`${window.API_BASE_URL}/admin/company`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${window.currentToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Céges adatok sikeresen elmentve!');
                } else {
                    alert('Hiba történt a mentés során.');
                }
            } catch (e) {
                alert('Hálózati hiba: ' + e.message);
            }
        });
    }

    const btnAdminUploadLogo = document.getElementById('btnAdminUploadLogo');
    const adminCompLogoInput = document.getElementById('adminCompLogoInput');

    if (btnAdminUploadLogo && adminCompLogoInput) {
        btnAdminUploadLogo.addEventListener('click', () => {
            adminCompLogoInput.click();
        });

        adminCompLogoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch(`${window.API_BASE_URL}/admin/company/logo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${window.currentToken}`
                    },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    const img = document.getElementById('adminCompLogoPreview');
                    img.src = `${window.API_BASE_URL.replace('/api', '')}/${data.logo_path}?t=${new Date().getTime()}`;
                    img.style.display = 'block';
                    alert('Logó sikeresen feltöltve!');
                } else {
                    alert('Hiba történt a logó feltöltésekor.');
                }
            } catch (err) {
                alert('Hálózati hiba: ' + err.message);
            }
        });
    }

    window.fetchAdminUsers = async function () {
        const list = document.getElementById('adminUserList');
        if (!list) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) {
                list.innerHTML = '<tr><td colspan="6">Hiba történt a felhasználók lekérdezése közben. Nincs jogosultságod vagy lejárt a tokened.</td></tr>';
                return;
            }
            const users = await res.json();
            if (!Array.isArray(users)) return;
            list.innerHTML = '';

            const jobAssignSelect = document.getElementById('adminJobAssignSelect');
            if (jobAssignSelect) {
                jobAssignSelect.innerHTML = '<option value="">-- Válassz kollégát --</option>';
            }

            users.forEach(u => {
                if (jobAssignSelect) {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.text = `${u.username} (${u.role})`;
                    jobAssignSelect.appendChild(opt);
                }

                const tr = document.createElement('tr');
                const expiry = u.subscription_expires ? new Date(u.subscription_expires).toISOString().split('T')[0] : '';
                tr.innerHTML = `
                    <td>${u.id}</td>
                    <td>${u.username}</td>
                    <td><input type="email" value="${u.email || ''}" onchange="updateUser(${u.id}, {email: this.value})" style="width: 150px; padding: 0.2rem;" placeholder="Email cím"></td>
                    <td>
                        <select onchange="updateUser(${u.id}, {is_active: this.value === 'active'})">
                            <option value="active" ${u.is_active ? 'selected' : ''}>Aktív</option>
                            <option value="inactive" ${!u.is_active ? 'selected' : ''}>Tiltott</option>
                        </select>
                    </td>
                    <td>
                        <select onchange="updateUser(${u.id}, {role: this.value})">
                            <option value="TECH" ${u.role === 'TECH' ? 'selected' : ''}>Villanyszerelő</option>
                            <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin / Cégvezető</option>
                        </select>
                    </td>
                    <td>
                        <input type="date" value="${expiry}" onchange="updateUser(${u.id}, {subscription_expires: this.value})">
                    </td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="deleteUser(${u.id})">Törlés</button>
                    </td>
                `;
                list.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    };

    window.updateUser = async function (id, data) {
        try {
            if (data.subscription_expires !== undefined) {
                if (data.subscription_expires) {
                    data.subscription_expires = new Date(data.subscription_expires).toISOString();
                } else {
                    data.subscription_expires = null;
                }
            }
            const res = await fetch(`${window.API_BASE_URL}/admin/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify(data)
            });
            if (res.ok) alert('Felhasználó frissítve!');
            else alert('Hiba a frissítés során!');
        } catch (err) { alert(err.message); }
    };

    window.deleteUser = async function (id) {
        if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.currentToken}`
                }
            });
            if (res.ok) {
                alert('Felhasználó törölve!');
                window.fetchAdminUsers();
            } else {
                alert('Hiba a törlés során!');
            }
        } catch (err) { alert(err.message); }
    };

    document.getElementById('btnAdminCreateUser')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnAdminCreateUser');
        const uName = document.getElementById('adminNewUsername').value;
        const uPass = document.getElementById('adminNewPassword').value;
        const uEmail = document.getElementById('adminNewEmail').value;
        const uRole = document.getElementById('adminNewRole').value;
        const errDiv = document.getElementById('adminCreateUserError');

        if (!uName || !uPass) {
            if (errDiv) errDiv.innerText = 'Felhasználónév és jelszó is kötelező!';
            return;
        }

        try {
            btn.disabled = true;
            const res = await fetch(`${window.API_BASE_URL}/admin/users?role=${uRole}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify({ username: uName, password: uPass, email: uEmail || null })
            });

            if (res.ok) {
                alert("Új felhasználó sikeresen létrehozva!");
                document.getElementById('adminNewUsername').value = '';
                document.getElementById('adminNewPassword').value = '';
                if (errDiv) errDiv.innerText = '';
                window.fetchAdminUsers();
            } else {
                const data = await res.json();
                if (errDiv) errDiv.innerText = data.detail || 'Hiba történt a létrehozáskor.';
            }
        } catch (e) {
            console.error(e);
            if (errDiv) errDiv.innerText = 'Hálózat vagy szerver hiba!';
        } finally {
            btn.disabled = false;
        }
    });

    document.getElementById('btnAdminCreateJob')?.addEventListener('click', async () => {
        const title = document.getElementById('adminJobTitle').value;
        const address = document.getElementById('adminJobAddress').value;
        const desc = document.getElementById('adminJobDesc').value;
        const dt = document.getElementById('adminJobDate').value;
        const assignee = document.getElementById('adminJobAssignSelect').value;

        if (!title || !assignee) return alert("A Cím és a Kijelölt kolléga megadása kötelező!");

        const payload = {
            title: title,
            address: address,
            description: desc,
            scheduled_date: dt ? new Date(dt).toISOString() : null,
            assigned_to_id: parseInt(assignee),
            status: "PENDING"
        };

        try {
            const res = await fetch(`${window.API_BASE_URL}/admin/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Feladat sikeresen kiosztva!");
                document.getElementById('adminJobTitle').value = '';
                document.getElementById('adminJobAddress').value = '';
                document.getElementById('adminJobDesc').value = '';
                if (window.fetchJobs) window.fetchJobs();
            } else {
                alert("Hiba a feladat kiosztásakor!");
            }
        } catch (e) { console.error(e); }
    });
}
