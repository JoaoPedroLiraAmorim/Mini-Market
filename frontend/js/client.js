let allProducts = [];
const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
        showToast("Faça login para acessar a loja", "error");
        setTimeout(() => window.location.href = "login.html", 800);
        return;
    }

    checkAdminButton(role);
    await verifyUserSession(token);
    await loadProducts();
    await updateCartBadge();
    setupSearch();

    document.getElementById("btn-logout")?.addEventListener("click", logout);
});

function checkAdminButton(role) {
    const adminLink = document.getElementById("admin-panel-link");
    if (adminLink) adminLink.style.display = role === "admin" ? "inline-flex" : "none";
}

async function verifyUserSession(token) {
    try {
        const res = await fetch("http://localhost:3000/perfil", { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            const email = data.dados?.email || localStorage.getItem("email") || "Cliente";
            const userNameEl = document.getElementById("user-name");
            if (userNameEl) userNameEl.innerText = email.split('@')[0];
            const roleEl = document.getElementById("user-role");
            if (roleEl) roleEl.innerText = data.dados?.role === 'admin' ? 'Admin' : 'Cliente';
            checkAdminButton(data.dados?.role);
        } else {
            logout();
        }
    } catch {
        const storedEmail = localStorage.getItem("email") || "Cliente";
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) userNameEl.innerText = storedEmail.split('@')[0];
        checkAdminButton(localStorage.getItem("role"));
    }
}

async function loadProducts() {
    try {
        const res = await fetch("http://localhost:3000/products");
        allProducts = res.ok ? await res.json() : [];
    } catch {
        allProducts = [];
    }
    renderProducts(allProducts);
}

function renderProducts(products) {
    const grid = document.getElementById("grid-produtos");
    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);"><p>Nenhum produto encontrado.</p></div>`;
        return;
    }

    grid.innerHTML = products.map(p => `
        <article class="card-produto" data-id="${p.id}">
            <div class="card-image-wrap">
                <span class="category-badge">${p.category || "Pelúcias"}</span>
                <img src="${p.image || ''}" alt="${p.name}" class="produto-imagem" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400';">
            </div>
            <div class="produto-info">
                <h3 class="produto-titulo">${p.name}</h3>
                <p class="produto-descricao">${p.description || "Produto oficial e licenciado."}</p>
                <div class="produto-footer">
                    <div class="price-container">
                        <span class="price-label">Preço</span>
                        <span class="produto-preco">${fmt(p.price)}</span>
                    </div>
                    <div class="card-actions">
                        <div class="qty-control">
                            <button type="button" class="qty-btn" onclick="changeQty(${p.id}, -1)">-</button>
                            <input type="number" id="qty-${p.id}" class="qty-input" value="1" min="1" max="99" readonly>
                            <button type="button" class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
                        </div>
                        <button type="button" class="btn btn-primary" onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Comprar</button>
                    </div>
                </div>
            </div>
        </article>
    `).join("");
}

function changeQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    if (input) input.value = Math.max(1, Math.min(99, (parseInt(input.value) || 1) + delta));
}

async function addToCart(productId, productName) {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Faça login para adicionar ao carrinho", "error");

    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    try {
        const res = await fetch("http://localhost:3000/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ productId, quantity })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`${quantity}x "${productName}" adicionado ao carrinho!`, "success");
            await updateCartBadge();
            if (qtyInput) qtyInput.value = 1;
        } else {
            showToast(data.error || "Erro ao adicionar produto.", "error");
        }
    } catch {
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

async function updateCartBadge() {
    const token = localStorage.getItem("token");
    const badge = document.getElementById("cart-count");
    if (!badge || !token) return;

    try {
        const res = await fetch("http://localhost:3000/cart", { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            const total = data.items ? data.items.reduce((s, i) => s + i.quantity, 0) : 0;
            badge.innerText = total;
            badge.style.display = total > 0 ? "inline-flex" : "none";

            const itemsPreview = document.getElementById("cart-items-preview");
            const totalPreview = document.getElementById("cart-total-value");
            const summaryBar = document.getElementById("cart-summary-bar");

            if (itemsPreview) itemsPreview.innerText = `${total} ${total === 1 ? 'item' : 'itens'}`;
            if (totalPreview) totalPreview.innerText = fmt(data.valorTotal || 0);
            if (summaryBar) summaryBar.style.display = total > 0 ? "flex" : "none";
        }
    } catch {}
}

function setupSearch() {
    document.getElementById("search-input")?.addEventListener("input", e => {
        const q = e.target.value.toLowerCase().trim();
        renderProducts(!q ? allProducts : allProducts.filter(p => 
            p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
        ));
    });
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
    }, 2800);
}

function logout() {
    localStorage.clear();
    showToast("Sessão encerrada com sucesso.", "success");
    setTimeout(() => window.location.href = "login.html", 500);
}
