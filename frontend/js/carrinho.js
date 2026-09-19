let currentCartData = null;
const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        showToast("Faça login para ver seu carrinho", "error");
        setTimeout(() => window.location.href = "login.html", 800);
        return;
    }

    await loadUserProfile(token);
    await loadCart(token);

    document.getElementById("btn-checkout")?.addEventListener("click", openCheckoutModal);
    document.getElementById("modal-cancel-btn")?.addEventListener("click", closeCheckoutModal);
    document.getElementById("modal-confirm-btn")?.addEventListener("click", confirmOrder);
    document.getElementById("btn-logout")?.addEventListener("click", logout);
});

async function loadUserProfile(token) {
    try {
        const res = await fetch("http://localhost:3000/perfil", { headers: { "Authorization": `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            const email = data.dados?.email || localStorage.getItem("email") || "Cliente";
            const userNameEl = document.getElementById("user-name");
            if (userNameEl) userNameEl.innerText = email.split('@')[0];
        }
    } catch {
        const email = localStorage.getItem("email") || "Cliente";
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) userNameEl.innerText = email.split('@')[0];
    }
}

async function loadCart(token) {
    const itemsListEl = document.getElementById("cart-items-container");
    const emptyStateEl = document.getElementById("empty-cart-state");
    const summaryCardEl = document.getElementById("cart-summary");

    try {
        const res = await fetch("http://localhost:3000/cart", { headers: { "Authorization": `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        currentCartData = data;

        if (!data.items?.length) {
            if (itemsListEl) itemsListEl.style.display = "none";
            if (emptyStateEl) emptyStateEl.style.display = "block";
            if (summaryCardEl) summaryCardEl.style.display = "none";
            return;
        }

        if (emptyStateEl) emptyStateEl.style.display = "none";
        if (itemsListEl) itemsListEl.style.display = "block";
        if (summaryCardEl) summaryCardEl.style.display = "block";

        itemsListEl.innerHTML = data.items.map(item => `
            <div class="cart-item">
                <img src="${item.image || ''}" alt="${item.name}" class="cart-item-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200';">
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">${fmt(item.price)} &times; <strong>${item.quantity} un.</strong></p>
                </div>
                <div class="cart-item-subtotal">${fmt(item.subtotal)}</div>
                <button type="button" class="btn btn-danger" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="removeFromCart(${item.productId})">Remover</button>
            </div>
        `).join("");

        document.getElementById("summary-subtotal").innerText = fmt(data.valorTotal);
        document.getElementById("summary-total").innerText = fmt(data.valorTotal);
    } catch {
        showToast("Não foi possível carregar o carrinho.", "error");
    }
}

async function removeFromCart(productId) {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
        const res = await fetch(`http://localhost:3000/cart/${productId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Item removido do carrinho.", "success");
            await loadCart(token);
        } else {
            const data = await res.json();
            showToast(data.error || "Erro ao remover item.", "error");
        }
    } catch {
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

function openCheckoutModal() {
    if (!currentCartData?.items?.length) return showToast("Seu carrinho está vazio!", "error");
    const modalTotal = document.getElementById("modal-order-total");
    if (modalTotal) modalTotal.innerText = fmt(currentCartData.valorTotal);
    document.getElementById("checkout-modal")?.classList.add("active");
}

function closeCheckoutModal() {
    document.getElementById("checkout-modal")?.classList.remove("active");
}

async function confirmOrder() {
    const token = localStorage.getItem("token");
    const confirmBtn = document.getElementById("modal-confirm-btn");
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerText = "Processando..."; }

    try {
        const res = await fetch("http://localhost:3000/checkout", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            closeCheckoutModal();
            showToast("Compra realizada com sucesso! Pedido confirmado.", "success");
            await loadCart(token);
        } else {
            const data = await res.json();
            showToast(data.error || "Erro ao finalizar compra.", "error");
        }
    } catch {
        showToast("Erro ao conectar com o servidor.", "error");
    } finally {
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerText = "Confirmar Pagamento"; }
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
