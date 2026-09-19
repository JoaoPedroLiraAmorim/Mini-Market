let catalogList = [];
const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
        alert("Acesso negado: Requer privilégios de Administrador!");
        window.location.href = "login.html";
        return;
    }

    await verifyAdminAccess(token);
    setupProductForm(token);
    setupImagePreview();
    await loadAdminCatalog(token);

    document.getElementById("btn-logout")?.addEventListener("click", logout);
});

async function verifyAdminAccess(token) {
    try {
        const res = await fetch("http://localhost:3000/painel-admin", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) {
            alert("Sessão administrativa expirada ou inválida.");
            return logout();
        }
        const emailEl = document.getElementById("admin-email");
        if (emailEl) emailEl.innerText = localStorage.getItem("email") || "admin@loja.com";
    } catch {}
}

async function loadAdminCatalog(token) {
    try {
        const res = await fetch("http://localhost:3000/products");
        catalogList = res.ok ? await res.json() : [];
    } catch {
        catalogList = [];
    }
    updateKPIs(catalogList);
    renderTable(catalogList);
}

function updateKPIs(products) {
    const totalEl = document.getElementById("kpi-total-products");
    const avgEl = document.getElementById("kpi-avg-price");
    const statusEl = document.getElementById("kpi-api-status");

    if (totalEl) totalEl.innerText = products.length;
    if (avgEl) {
        const avg = products.length ? products.reduce((acc, p) => acc + (Number(p.price) || 0), 0) / products.length : 0;
        avgEl.innerText = fmt(avg);
    }
    if (statusEl) {
        statusEl.innerText = "Online";
        statusEl.style.color = "var(--success)";
    }
}

function renderTable(products) {
    const tbody = document.getElementById("admin-products-tbody");
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nenhum produto cadastrado no catálogo.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td style="font-weight: 700; color: var(--text-muted); width: 60px;">#${p.id}</td>
            <td>
                <div class="table-product-cell">
                    <img src="${p.image || ''}" alt="${p.name}" class="table-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100';">
                    <div>
                        <strong>${p.name}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${p.description || "Sem descrição"}
                        </div>
                    </div>
                </div>
            </td>
            <td><span class="role-tag" style="background: rgba(0,0,0,0.08); color: var(--dark);">${p.category || "Pelúcias"}</span></td>
            <td style="font-weight: 700; color: var(--primary);">${fmt(p.price)}</td>
            <td style="text-align: right;">
                <button type="button" class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">Excluir</button>
            </td>
        </tr>
    `).join("");
}

function setupImagePreview() {
    const imgInput = document.getElementById("prod-image");
    const preview = document.getElementById("img-preview-box");
    if (!imgInput || !preview) return;

    imgInput.addEventListener("input", e => {
        const url = e.target.value.trim();
        preview.innerHTML = url 
            ? `<img src="${url}" alt="Pré-visualização" onerror="this.onerror=null; this.parentElement.innerHTML='URL inválida';">` 
            : `<span>Pré-visualização da imagem</span>`;
    });
}

function setupProductForm(token) {
    const form = document.getElementById("form-add-product");
    if (!form) return;

    form.addEventListener("submit", async e => {
        e.preventDefault();
        const name = document.getElementById("prod-name").value.trim();
        const price = document.getElementById("prod-price").value;
        const category = document.getElementById("prod-category").value;
        const image = document.getElementById("prod-image").value.trim();
        const description = document.getElementById("prod-desc").value.trim();
        const submitBtn = document.getElementById("btn-submit-product");

        if (!name || !price) return showToast("Nome e preço são obrigatórios!", "error");

        submitBtn.disabled = true;
        submitBtn.innerText = "Cadastrando...";

        try {
            const res = await fetch("http://localhost:3000/products", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name, price: parseFloat(price), category, image, description })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Produto cadastrado com sucesso!", "success");
                form.reset();
                const preview = document.getElementById("img-preview-box");
                if (preview) preview.innerHTML = `<span>Pré-visualização da imagem</span>`;
                await loadAdminCatalog(token);
            } else {
                showToast(data.error || "Erro ao cadastrar produto", "error");
            }
        } catch {
            showToast("Erro ao conectar ao servidor", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Adicionar Produto";
        }
    });
}

async function deleteProduct(productId, productName) {
    const token = localStorage.getItem("token");
    if (!confirm(`Tem certeza que deseja excluir "${productName}" (ID #${productId})?`)) return;

    try {
        const res = await fetch(`http://localhost:3000/products/${productId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Produto removido com sucesso!`, "success");
            await loadAdminCatalog(token);
        } else {
            showToast(data.error || "Erro ao excluir produto", "error");
        }
    } catch {
        showToast("Erro ao conectar ao servidor", "error");
    }
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
    window.location.href = "login.html";
}
