document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Strict Admin Authorization Check
    if (!token || role !== "admin") {
        alert("Acesso negado: Requer privilégios de Administrador!");
        window.location.href = "login.html";
        return;
    }

    // Verify token with backend
    await verifyAdminAccess(token);

    // Setup Form & Image Preview
    setupProductForm(token);
    setupImagePreview();

    // Load Catalog & KPIs
    await loadAdminCatalog(token);

    // Setup Logout
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
});

let catalogList = [];

async function verifyAdminAccess(token) {
    try {
        const response = await fetch("http://localhost:3000/painel-admin", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            alert("Sessão administrativa expirada ou inválida.");
            logout();
            return;
        }

        const email = localStorage.getItem("email") || "admin@loja.com";
        const emailEl = document.getElementById("admin-email");
        if (emailEl) emailEl.innerText = email;

    } catch (err) {
        console.warn("Erro ao validar painel admin com servidor:", err);
    }
}

async function loadAdminCatalog(token) {
    const tbody = document.getElementById("admin-products-tbody");
    if (!tbody) return;

    try {
        const response = await fetch("http://localhost:3000/products");
        if (response.ok) {
            catalogList = await response.json();
        } else {
            catalogList = [];
        }
    } catch (err) {
        console.error("Erro ao buscar produtos:", err);
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
        if (products.length > 0) {
            const sum = products.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
            const avg = sum / products.length;
            avgEl.innerText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avg);
        } else {
            avgEl.innerText = "R$ 0,00";
        }
    }

    if (statusEl) {
        statusEl.innerText = "Online";
        statusEl.style.color = "var(--success)";
    }
}

function renderTable(products) {
    const tbody = document.getElementById("admin-products-tbody");
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Nenhum produto cadastrado no catálogo.
                </td>
            </tr>
        `;
        return;
    }

    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    const fallbackImg = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100";

    tbody.innerHTML = products.map(product => `
        <tr>
            <td style="font-weight: 700; color: var(--text-muted); width: 60px;">#${product.id}</td>
            <td>
                <div class="table-product-cell">
                    <img 
                        src="${product.image || fallbackImg}" 
                        alt="${product.name}" 
                        class="table-img"
                        onerror="this.onerror=null; this.src='${fallbackImg}';"
                    >
                    <div>
                        <strong>${product.name}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${product.description || "Sem descrição"}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span class="role-tag" style="background: rgba(255,255,255,0.06); color: var(--text-secondary);">
                    ${product.category || "Pelúcias"}
                </span>
            </td>
            <td style="font-weight: 700; color: var(--accent);">
                ${formatter.format(product.price)}
            </td>
            <td style="text-align: right;">
                <button 
                    type="button" 
                    class="btn btn-danger" 
                    style="padding: 0.4rem 0.8rem; font-size: 0.8rem;"
                    onclick="deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}')"
                >
                    Excluir
                </button>
            </td>
        </tr>
    `).join("");
}

function setupImagePreview() {
    const imgInput = document.getElementById("prod-image");
    const previewContainer = document.getElementById("img-preview-box");
    if (!imgInput || !previewContainer) return;

    imgInput.addEventListener("input", (e) => {
        const url = e.target.value.trim();
        if (url) {
            previewContainer.innerHTML = `<img src="${url}" alt="Pré-visualização" onerror="this.onerror=null; this.parentElement.innerHTML='URL de imagem inválida';">`;
        } else {
            previewContainer.innerHTML = `<span>Pré-visualização da imagem</span>`;
        }
    });
}

function setupProductForm(token) {
    const form = document.getElementById("form-add-product");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("prod-name").value.trim();
        const price = document.getElementById("prod-price").value;
        const category = document.getElementById("prod-category").value;
        const image = document.getElementById("prod-image").value.trim();
        const description = document.getElementById("prod-desc").value.trim();
        const submitBtn = document.getElementById("btn-submit-product");

        if (!name || !price) {
            showToast("Nome e preço são obrigatórios!", "error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Cadastrando...";

        try {
            const response = await fetch("http://localhost:3000/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    price: parseFloat(price),
                    category,
                    image: image || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400",
                    description
                })
            });

            const data = await response.json();

            if (response.ok) {
                showToast("Produto cadastrado com sucesso!", "success");
                form.reset();
                const previewContainer = document.getElementById("img-preview-box");
                if (previewContainer) previewContainer.innerHTML = `<span>Pré-visualização da imagem</span>`;
                await loadAdminCatalog(token);
            } else {
                showToast(data.error || "Erro ao cadastrar produto", "error");
            }
        } catch (err) {
            console.error("Erro no cadastro:", err);
            showToast("Erro ao conectar ao servidor", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Adicionar Produto";
        }
    });
}

async function deleteProduct(productId, productName) {
    const token = localStorage.getItem("token");
    if (!confirm(`Tem certeza que deseja excluir o produto "${productName}" (ID #${productId}) do catálogo?`)) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/products/${productId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Produto "${productName}" removido com sucesso!`, "success");
            await loadAdminCatalog(token);
        } else {
            showToast(data.error || "Erro ao excluir produto", "error");
        }
    } catch (err) {
        console.error("Erro na exclusão:", err);
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
