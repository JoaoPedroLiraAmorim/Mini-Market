document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    if (!token) {
        showToast("Faça login para ver seu carrinho", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 800);
        return;
    }

    // Load user profile
    await loadUserProfile(token);

    // Load Cart Items
    await loadCart(token);

    // Setup Checkout Button
    const checkoutBtn = document.getElementById("btn-checkout");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => openCheckoutModal());
    }

    // Setup Modal Buttons
    const modalCancelBtn = document.getElementById("modal-cancel-btn");
    const modalConfirmBtn = document.getElementById("modal-confirm-btn");
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener("click", closeCheckoutModal);
    }
    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener("click", confirmOrder);
    }

    // Setup Logout
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
});

let currentCartData = null;

async function loadUserProfile(token) {
    try {
        const response = await fetch("http://localhost:3000/perfil", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const email = data.dados.email || localStorage.getItem("email") || "Cliente";
            const userNameEl = document.getElementById("user-name");
            if (userNameEl) userNameEl.innerText = email.split('@')[0];
        }
    } catch (err) {
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
        const response = await fetch("http://localhost:3000/cart", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Erro ao consultar carrinho");
        }

        const data = await response.json();
        currentCartData = data;

        const formatter = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        if (!data.items || data.items.length === 0) {
            if (itemsListEl) itemsListEl.style.display = "none";
            if (emptyStateEl) emptyStateEl.style.display = "block";
            if (summaryCardEl) summaryCardEl.style.display = "none";
            return;
        }

        if (emptyStateEl) emptyStateEl.style.display = "none";
        if (itemsListEl) itemsListEl.style.display = "block";
        if (summaryCardEl) summaryCardEl.style.display = "block";

        const fallbackImg = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200";

        itemsListEl.innerHTML = data.items.map(item => `
            <div class="cart-item">
                <img 
                    src="${item.image || fallbackImg}" 
                    alt="${item.name}" 
                    class="cart-item-img"
                    onerror="this.onerror=null; this.src='${fallbackImg}';"
                >
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${item.name}</h3>
                    <p class="cart-item-price">
                        ${formatter.format(item.price)} &times; <strong>${item.quantity} un.</strong>
                    </p>
                </div>
                <div class="cart-item-subtotal">
                    ${formatter.format(item.subtotal)}
                </div>
                <button 
                    type="button" 
                    class="btn btn-danger" 
                    style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" 
                    onclick="removeFromCart(${item.productId})"
                    title="Remover item do carrinho"
                >
                    Remover
                </button>
            </div>
        `).join("");

        // Update Summary
        document.getElementById("summary-subtotal").innerText = formatter.format(data.valorTotal);
        document.getElementById("summary-total").innerText = formatter.format(data.valorTotal);

    } catch (err) {
        console.error("Erro ao carregar carrinho:", err);
        showToast("Não foi possível carregar o carrinho.", "error");
    }
}

async function removeFromCart(productId) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`http://localhost:3000/cart/${productId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            showToast("Item removido do carrinho.", "success");
            await loadCart(token);
        } else {
            const data = await response.json();
            showToast(data.error || "Erro ao remover item.", "error");
        }
    } catch (err) {
        console.error("Erro:", err);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

function openCheckoutModal() {
    if (!currentCartData || !currentCartData.items || currentCartData.items.length === 0) {
        showToast("Seu carrinho está vazio!", "error");
        return;
    }

    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    const modalTotalEl = document.getElementById("modal-order-total");
    if (modalTotalEl) {
        modalTotalEl.innerText = formatter.format(currentCartData.valorTotal);
    }

    const modal = document.getElementById("checkout-modal");
    if (modal) modal.classList.add("active");
}

function closeCheckoutModal() {
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.classList.remove("active");
}

async function confirmOrder() {
    const token = localStorage.getItem("token");
    const confirmBtn = document.getElementById("modal-confirm-btn");
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Processando...";

    try {
        // Clear cart in backend
        const response = await fetch("http://localhost:3000/cart", {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            closeCheckoutModal();
            showToast("Compra realizada com sucesso! Pedido confirmado.", "success");
            await loadCart(token);
        } else {
            showToast("Erro ao finalizar a compra.", "error");
        }
    } catch (err) {
        console.error("Erro na finalização:", err);
        showToast("Erro ao conectar com o servidor.", "error");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Confirmar Pagamento";
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
