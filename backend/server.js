const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "Pikachu123";

const users = [];
const carts = [];
const products = [
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

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token ausente' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err || !['admin', 'client'].includes(user?.role)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        req.user = user;
        next();
    });
}

const authorizeAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Acesso negado: Requer privilégios de Admin' });
};

app.get("/products", (req, res) => {
    res.json(products);
});

app.post("/products", authenticateToken, authorizeAdmin, (req, res) => {
    const { name, price, description, image, category } = req.body;
    if (!name || price === undefined || price === null || price === '') {
        return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const newProduct = {
        id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
        name,
        price: Number(price),
        category: category || "Geral",
        image: image || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400",
        description: description || "Produto oficial de excelente qualidade."
    };

    products.push(newProduct);
    res.status(201).json({
        message: "Produto cadastrado com sucesso!",
        product: newProduct
    });
});

app.delete("/products/:id", authenticateToken, authorizeAdmin, (req, res) => {
    const idx = products.findIndex(p => p.id === parseInt(req.params.id));
    if (idx === -1) {
        return res.status(404).json({ error: "Produto não encontrado no catálogo" });
    }

    products.splice(idx, 1);
    res.json({ message: "Produto removido com sucesso do catálogo!" });
});

app.get("/cart", authenticateToken, (req, res) => {
    const userCart = carts.find(c => c.userId === req.user.id);
    if (!userCart || !userCart.items.length) {
        return res.json({ items: [], valorTotal: 0 });
    }

    const items = userCart.items.map(item => {
        const prod = products.find(p => p.id === item.productId) || {
            name: "Produto Não Encontrado",
            price: 0,
            image: ""
        };
        const subtotal = +(prod.price * item.quantity).toFixed(2);

        return {
            productId: item.productId,
            name: prod.name,
            price: prod.price,
            image: prod.image || "",
            quantity: item.quantity,
            subtotal
        };
    });

    const valorTotal = +items.reduce((acc, i) => acc + i.subtotal, 0).toFixed(2);
    res.json({ items, valorTotal });
});

app.post("/cart", authenticateToken, (req, res) => {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
        return res.status(400).json({ error: "productId e quantity são obrigatórios" });
    }

    let userCart = carts.find(c => c.userId === req.user.id);
    if (!userCart) {
        userCart = { userId: req.user.id, items: [] };
        carts.push(userCart);
    }

    const item = userCart.items.find(i => i.productId === parseInt(productId));
    if (item) {
        item.quantity += parseInt(quantity);
    } else {
        userCart.items.push({
            productId: parseInt(productId),
            quantity: parseInt(quantity)
        });
    }

    res.json({
        message: "Item adicionado ao carrinho com sucesso!",
        cart: userCart
    });
});

app.delete("/cart/:productId", authenticateToken, (req, res) => {
    const userCart = carts.find(c => c.userId === req.user.id);
    if (!userCart) {
        return res.status(404).json({ error: "Carrinho não encontrado" });
    }

    const idx = userCart.items.findIndex(i => i.productId === parseInt(req.params.productId));
    if (idx === -1) {
        return res.status(404).json({ error: "Item não encontrado no carrinho" });
    }

    userCart.items.splice(idx, 1);
    res.json({
        message: "Item removido do carrinho com sucesso!",
        cart: userCart
    });
});

app.delete("/cart", authenticateToken, (req, res) => {
    const userCart = carts.find(c => c.userId === req.user.id);
    if (userCart) {
        userCart.items = [];
    }
    res.json({ message: "Carrinho esvaziado com sucesso!" });
});

app.post("/checkout", authenticateToken, (req, res) => {
    const userCart = carts.find(c => c.userId === req.user.id);
    if (!userCart || !userCart.items.length) {
        return res.status(400).json({ error: "Carrinho vazio. Adicione itens antes de finalizar." });
    }

    userCart.items = [];
    res.json({ message: "Pedido finalizado com sucesso! Carrinho esvaziado." });
});

app.post("/register", async (req, res) => {
    const { email, password, role = 'client' } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: "Este email já está cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({
        id: users.length + 1,
        email: email.toLowerCase(),
        password: hashedPassword,
        role
    });

    res.status(201).json({ message: "Usuário registrado com sucesso!" });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "2h" }
    );

    res.json({ token, role: user.role, email: user.email });
});

app.get('/perfil', authenticateToken, (req, res) => {
    res.json({ message: 'Acesso permitido para clientes e admins', dados: req.user });
});

app.post('/painel-admin', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({ message: 'Bem-vindo ao painel dos administradores!' });
});

app.listen(3000, async () => {
    if (!users.length) {
        users.push(
            {
                id: 1,
                email: "admin@loja.com",
                password: await bcrypt.hash("admin123", 10),
                role: "admin"
            },
            {
                id: 2,
                email: "cliente@loja.com",
                password: await bcrypt.hash("cliente123", 10),
                role: "client"
            }
        );
        console.log("Contas padrão criadas: admin@loja.com / cliente@loja.com");
    }
    console.log("Servidor rodando na porta 3000");
});
