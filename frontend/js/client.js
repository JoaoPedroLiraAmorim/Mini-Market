document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Check Authentication
    if (!token) {
        showToast("Faça login para acessar a loja", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 800);
        return;
    }

    // Check if current user is admin to display "Gerenciar Produtos" button
    checkAdminButton(role);

    // Verify session with backend
    await verifyUserSession(token);

    // Load Catalog Products
    await loadProducts();

    // Update Cart Counter Badge
    await updateCartBadge();

    // Setup Search & Filter
    setupSearch();

    // Setup Logout Button
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
});

let allProducts = [];

function checkAdminButton(role) {
    const adminLink = document.getElementById("admin-panel-link");
    if (adminLink) {
        if (role === "admin") {
            adminLink.style.display = "inline-flex";
        } else {
            adminLink.style.display = "none";
        }
    }
}

// Fallback initial products if backend is disconnected
const fallbackProducts = [
    {
        id: 1,
        name: "Pelúcia Pikachu 28cm",
        price: 239.90,
        category: "Pelúcias",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0gQP_v3sRffoFPmuLYg9YID69FYI0HPGJNOW5CoVahQ&s=10",
        description: "O personagem icônico da série de TV pode ser seu companheiro assim como é para o Ash! Produto em pelúcia de 28cm super macia e antialérgica."
    },
    {
        id: 2,
        name: "Pelúcia Chansey Squishmallow",
        price: 199.90,
        category: "Pelúcias",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7Pd0GvYDzmrB_JBrWqWAhH3xCJwrxodJTwJuNjeEWoQ&s=10",
        description: "Squishmallows Chansey de 10 polegadas traz a magia do Pokémon para o mundo dos colecionáveis. Conforto e fofura irresistíveis."
    },
    {
        id: 3,
        name: "Pelúcia Charmander Dorminhoco",
        price: 199.90,
        category: "Pelúcias",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWtWLpRqWOP0pklTuS5AUYdH5Wm3e5F7bFEEx1JB8RRA&s=10",
        description: "Pelúcia dorminhoca e aconchegante de 45cm feita com material macio de alta qualidade. Perfeita para abraçar."
    }
];

async function verifyUserSession(token) {
    try {
        const response = await fetch("http://localhost:3000/perfil", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const email = data.dados.email || localStorage.getItem("email") || "Cliente";
            const userNameEl = document.getElementById("user-name");
            if (userNameEl) {
                userNameEl.innerText = email.split('@')[0];
            }
            const roleEl = document.getElementById("user-role");
            if (roleEl) {
                roleEl.innerText = data.dados.role === 'admin' ? 'Admin' : 'Cliente';
            }
            // Ensure button shows if backend role is admin
            checkAdminButton(data.dados.role);
        } else {
            logout();
        }
    } catch (err) {
        console.warn("Servidor offline ou inacessível:", err);
        const storedEmail = localStorage.getItem("email") || "Cliente";
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) {
            userNameEl.innerText = storedEmail.split('@')[0];
        }
        checkAdminButton(localStorage.getItem("role"));
    }
}

async function loadProducts() {
    const grid = document.getElementById("grid-produtos");
    if (!grid) return;

    try {
        const response = await fetch("http://localhost:3000/products");
        if (response.ok) {
            allProducts = await response.json();
        } else {
            allProducts = fallbackProducts;
        }
    } catch (err) {
        console.warn("Usando produtos locais de demonstração:", err);
        allProducts = fallbackProducts;
    }

    renderProducts(allProducts);
}

function renderProducts(productsToRender) {
    const grid = document.getElementById("grid-produtos");
    if (!grid) return;

    if (!productsToRender || productsToRender.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <p>Nenhum produto encontrado com esse termo.</p>
            </div>
        `;
        return;
    }

    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    grid.innerHTML = productsToRender.map(product => {
        const fallbackImg = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400";
        const imgSrc = product.image || fallbackImg;
        const category = product.category || "Pelúcias";

        return `
            <article class="card-produto" data-id="${product.id}">
                <div class="card-image-wrap">
                    <span class="category-badge">${category}</span>
                    <img 
                        src="${imgSrc}" 
                        alt="${product.name}" 
                        class="produto-imagem"
                        onerror="this.onerror=null; this.src='${fallbackImg}';"
                    >
                </div>
                <div class="produto-info">
                    <h3 class="produto-titulo">${product.name}</h3>
                    <p class="produto-descricao">${product.description || "Produto oficial e licenciado de excelente qualidade."}</p>
                    
                    <div class="produto-footer">
                        <div class="price-container">
                            <span class="price-label">Preço</span>
                            <span class="produto-preco">${formatter.format(product.price)}</span>
                        </div>
                        <div class="card-actions">
                            <div class="qty-control">
                                <button type="button" class="qty-btn" onclick="changeQty(${product.id}, -1)">-</button>
                                <input type="number" id="qty-${product.id}" class="qty-input" value="1" min="1" max="99" readonly>
                                <button type="button" class="qty-btn" onclick="changeQty(${product.id}, 1)">+</button>
                            </div>
                            <button 
                                type="button" 
                                class="btn btn-primary" 
                                onclick="addToCart(${product.id}, '${product.name.replace(/'/g, "\\'")}')"
                            >
                                Comprar
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function changeQty(productId, delta) {
    const input = document.getElementById(`qty-${productId}`);
    if (input) {
        let current = parseInt(input.value) || 1;
        current += delta;
        if (current < 1) current = 1;
        if (current > 99) current = 99;
        input.value = current;
    }
}

async function addToCart(productId, productName) {
    const token = localStorage.getItem("token");
    if (!token) {
        showToast("Faça login para adicionar ao carrinho", "error");
        return;
    }

    const qtyInput = document.getElementById(`qty-${productId}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    try {
        const response = await fetch("http://localhost:3000/cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`${quantity}x "${productName}" adicionado ao carrinho!`, "success");
            await updateCartBadge();
            if (qtyInput) qtyInput.value = 1;
        } else {
            showToast(data.error || "Erro ao adicionar produto.", "error");
        }
    } catch (err) {
        console.error("Erro ao adicionar no carrinho:", err);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

async function updateCartBadge() {
    const token = localStorage.getItem("token");
    const badge = document.getElementById("cart-count");
    if (!badge || !token) return;

    try {
        const response = await fetch("http://localhost:3000/cart", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const totalItems = data.items ? data.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
            badge.innerText = totalItems;
            badge.style.display = totalItems > 0 ? "inline-flex" : "none";
        }
    } catch (err) {
        console.warn("Não foi possível carregar contagem do carrinho:", err);
    }
}

function setupSearch() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderProducts(allProducts);
            return;
        }

        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.category && p.category.toLowerCase().includes(query)) ||
            (p.description && p.description.toLowerCase().includes(query))
        );

        renderProducts(filtered);
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
    setTimeout(() => {
        window.location.href = "login.html";
    }, 500);
}
