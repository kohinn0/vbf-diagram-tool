/**
 * Kosár (vbf_cart localStorage) – ugyanaz a kulcs, mint a főoldalon (index.html).
 */

const CART_KEY = 'vbf_cart';

function apiBase() {
    return window.API_BASE_URL || '';
}

function getCart() {
    try {
        const s = localStorage.getItem(CART_KEY);
        return s ? JSON.parse(s) : { items: [] };
    } catch {
        return { items: [] };
    }
}

function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
}

function formatPrice(n) {
    if (n == null || n === 0) return 'Ingyenes';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function updateCartUI() {
    const cart = getCart();
    const badge = document.getElementById('cartBadge');
    const empty = document.getElementById('cartEmpty');
    const content = document.getElementById('cartContent');
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotal');
    if (badge) {
        if (cart.items.length) {
            badge.textContent = String(cart.items.length);
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    if (cart.items.length === 0) {
        if (empty) empty.style.display = 'block';
        if (content) content.style.display = 'none';
        return;
    }
    if (empty) empty.style.display = 'none';
    if (content) content.style.display = 'block';
    if (!list || !totalEl) return;
    let total = 0;
    list.innerHTML = cart.items.map((it) => {
        total += it.price || 0;
        const label = (it.label || it.plan_type || '').replace(/</g, '&lt;');
        return `<li style="padding: 10px 0; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between;"><span>${label}</span><strong>${formatPrice(it.price)} Ft</strong></li>`;
    }).join('');
    totalEl.textContent = `Összesen: ${formatPrice(total)} Ft`;
}

function isLoggedIn() {
    return !!(window.currentToken && window.currentUserData);
}

function syncCheckoutStepForSession() {
    const guestBlock = document.getElementById('cartGuestRegBlock');
    const loggedNote = document.getElementById('cartLoggedInNote');
    if (isLoggedIn()) {
        if (guestBlock) guestBlock.style.display = 'none';
        if (loggedNote) {
            loggedNote.style.display = 'block';
            const u = window.currentUserData;
            const company = (u && u.company_name) ? u.company_name : 'céged';
            loggedNote.textContent = `Bejelentkezve vagy: a megrendelés a jelenlegi fiókodhoz és a(z) „${company}” céghez kapcsolódik. Az utalásos számlához lent add meg a számlázási adatokat.`;
        }
        prefillTransferFromUser();
        prefillStripeFromUser();
    } else {
        if (guestBlock) guestBlock.style.display = 'block';
        if (loggedNote) loggedNote.style.display = 'none';
    }
}

function prefillTransferFromUser() {
    const u = window.currentUserData;
    if (!u) return;
    const emailEl = document.getElementById('cartEmail');
    const nameEl = document.getElementById('cartName');
    if (emailEl && u.email) emailEl.value = u.email;
    if (nameEl && u.company_name) nameEl.value = u.company_name;
}

function prefillStripeFromUser() {
    if (!isLoggedIn() || !window.currentUserData?.email) return;
    const em = document.getElementById('cartStripeEmail');
    const p1 = document.getElementById('cartStripePassword');
    const p2 = document.getElementById('cartStripePasswordConfirm');
    if (em) em.value = window.currentUserData.email;
    if (p1) p1.value = '';
    if (p2) p2.value = '';
}

function openCartPanel() {
    const panel = document.getElementById('cartPanel');
    if (!panel) return;
    panel.style.display = 'flex';
    panel.setAttribute('aria-hidden', 'false');
    const s2 = document.getElementById('cartStep2');
    const s1 = document.getElementById('cartStep1');
    if (s2) s2.style.display = 'none';
    if (s1) s1.style.display = 'block';
    const tf = document.getElementById('cartTransferForm');
    if (tf) tf.style.display = 'none';
    const st = document.getElementById('cartTransferStatus');
    if (st) st.textContent = '';
    const stripeSt = document.getElementById('cartStripeStatus');
    if (stripeSt) {
        stripeSt.textContent = '';
        stripeSt.style.color = '';
    }
    syncCheckoutStepForSession();
}

function closeCartPanel() {
    const panel = document.getElementById('cartPanel');
    if (panel) {
        panel.style.display = 'none';
        panel.setAttribute('aria-hidden', 'true');
    }
}

export function initCart() {
    const btnCart = document.getElementById('btnCart');
    const panel = document.getElementById('cartPanel');
    const btnClose = document.getElementById('cartPanelClose');
    const btnCheckout = document.getElementById('btnCartCheckout');
    const btnBack = document.getElementById('cartBackToStep1');
    const btnPayTransfer = document.getElementById('cartPayTransfer');
    const btnRequest = document.getElementById('btnCartRequestInvoice');
    const btnPayCard = document.getElementById('btnCartPayCard');

    window.vbfCartOnUserLoaded = () => {
        syncCheckoutStepForSession();
    };
    window.vbfCartOnUserLoggedOut = () => {
        syncCheckoutStepForSession();
    };

    if (btnCart) {
        btnCart.addEventListener('click', () => {
            openCartPanel();
        });
    }
    if (panel) {
        panel.addEventListener('click', (e) => {
            if (e.target === panel) closeCartPanel();
        });
    }
    if (btnClose) btnClose.addEventListener('click', closeCartPanel);
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            document.getElementById('cartStep1').style.display = 'none';
            document.getElementById('cartStep2').style.display = 'block';
            syncCheckoutStepForSession();
        });
    }
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            document.getElementById('cartStep2').style.display = 'none';
            document.getElementById('cartStep1').style.display = 'block';
            const tf = document.getElementById('cartTransferForm');
            if (tf) tf.style.display = 'none';
        });
    }
    if (btnPayTransfer) {
        btnPayTransfer.addEventListener('click', () => {
            const tf = document.getElementById('cartTransferForm');
            if (tf) tf.style.display = 'block';
            syncCheckoutStepForSession();
        });
    }
    if (btnPayCard) {
        btnPayCard.addEventListener('click', async () => {
            const cart = getCart();
            if (!cart.items.length) return;
            const email = document.getElementById('cartStripeEmail')?.value?.trim() || null;
            const pw = document.getElementById('cartStripePassword')?.value || '';
            const pwc = document.getElementById('cartStripePasswordConfirm')?.value || '';
            const statusEl = document.getElementById('cartStripeStatus');
            if (pw && pw !== pwc) {
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'A jelszavak nem egyeznek.';
                }
                return;
            }
            if (pw && !email) {
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'Jelszó megadásához e-mail cím is kell.';
                }
                return;
            }
            if (statusEl) {
                statusEl.style.color = '';
                statusEl.textContent = 'Átirányítás a fizetéshez…';
            }
            try {
                const res = await fetch(`${apiBase()}/api/payments/create-checkout-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan: cart.items[0].plan_type,
                        email: email || null,
                        password: pw || null,
                        return_page: 'app'
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.url) {
                    window.location.href = data.url;
                    return;
                }
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent =
                        typeof data.detail === 'string' ? data.detail : 'Nem sikerült elindítani a fizetést.';
                }
            } catch {
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'Hálózati hiba.';
                }
            }
        });
    }
    if (btnRequest) {
        btnRequest.addEventListener('click', async () => {
            const cart = getCart();
            if (!cart.items.length) return;
            const email = document.getElementById('cartEmail')?.value?.trim();
            const name = document.getElementById('cartName')?.value?.trim();
            const address = document.getElementById('cartAddress')?.value?.trim();
            const tax = document.getElementById('cartTax')?.value?.trim() || null;
            const statusEl = document.getElementById('cartTransferStatus');
            if (!email || !name) {
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'E-mail és név kötelező.';
                }
                return;
            }
            if (!address || address.length < 5) {
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'Számlázási cím megadása kötelező.';
                }
                return;
            }
            if (statusEl) {
                statusEl.textContent = 'Küldés…';
                statusEl.style.color = '';
            }
            try {
                const res = await fetch(`${apiBase()}/api/payments/request-bank-transfer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        customer_name: name,
                        plan_type: cart.items[0].plan_type,
                        buyer_address: address,
                        buyer_tax_number: tax
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.message) {
                    if (statusEl) {
                        statusEl.style.color = 'var(--success)';
                        statusEl.textContent = data.message;
                    }
                    setCart({ items: [] });
                } else if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = typeof data.detail === 'string' ? data.detail : 'Hiba történt.';
                }
            } catch {
                if (statusEl) {
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = 'Hálózati hiba.';
                }
            }
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === CART_KEY) updateCartUI();
    });

    updateCartUI();

    loadPlansForAppCart().catch(() => {});
    fetch(`${apiBase()}/api/payments/card-payments-enabled`)
        .then((r) => r.json())
        .then((j) => {
            if (j && j.enabled) {
                const w = document.getElementById('cartStripeWrap');
                if (w) w.style.display = 'block';
            }
        })
        .catch(() => {});
}

async function loadPlansForAppCart() {
    const res = await fetch(`${apiBase()}/api/plans`);
    if (!res.ok) return;
    const plans = await res.json();
    const paid = (plans || []).filter(
        (p) =>
            (p.plan_key && p.plan_key !== 'FREE') ||
            (p.price_monthly && p.price_monthly > 0) ||
            (p.price_yearly && p.price_yearly > 0)
    );
    const wrap = document.getElementById('cartAppPlanButtons');
    if (!wrap || paid.length === 0) return;
    const monthlyPlan = paid.find((p) => p.price_monthly != null && p.price_monthly > 0);
    const yearlyPlan = paid.find((p) => p.price_yearly != null && p.price_yearly > 0) || monthlyPlan;
    wrap.innerHTML = '';
    if (monthlyPlan && monthlyPlan.price_monthly != null) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-secondary cart-btn-full';
        b.style.marginBottom = '0.5rem';
        b.textContent = `${monthlyPlan.display_name || 'Havi'} – kosárba (${formatPrice(monthlyPlan.price_monthly)} Ft)`;
        b.addEventListener('click', () => {
            setCart({
                items: [
                    {
                        plan_type: 'monthly',
                        label: `${monthlyPlan.display_name || 'Havi'} előfizetés`,
                        price: parseInt(monthlyPlan.price_monthly, 10)
                    }
                ]
            });
            openCartPanel();
        });
        wrap.appendChild(b);
    }
    if (yearlyPlan && yearlyPlan.price_yearly != null) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-primary cart-btn-full';
        b.textContent = `${yearlyPlan.display_name || 'Éves'} – kosárba (${formatPrice(yearlyPlan.price_yearly)} Ft)`;
        b.addEventListener('click', () => {
            setCart({
                items: [
                    {
                        plan_type: 'yearly',
                        label: `${yearlyPlan.display_name || 'Éves'} előfizetés`,
                        price: parseInt(yearlyPlan.price_yearly, 10)
                    }
                ]
            });
            openCartPanel();
        });
        wrap.appendChild(b);
    }
}
