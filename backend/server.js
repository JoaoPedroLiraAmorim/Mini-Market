const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "Pikachu123";

const users = []; 
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
const carts = [];


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) return res.status(401).json({ error: 'Token ausente' });
  
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
  
      req.user = decoded; 
  
      if (req.user.role === 'admin' || req.user.role === 'client') {
        return next();
      }
  
      return res.status(403).json({ error: 'Acesso proibido' });
    });
}

function authorizeAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') { 
      next(); 
    } else { 
      res.status(403).json({ error: 'Acesso negado: Requer privilégios de Admin' }); 
    } 
}

app.get("/products", (req, res) => {
    res.json(products);
});

app.post("/products", authenticateToken, authorizeAdmin, (req, res) => {
    const { name, price, description, image, category } = req.body;

    if (!name || price === undefined || price === null || price === '') {
        return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct = {
        id: nextId, 
        name: name,
        price: Number(price),
        category: category || "Geral",
        image: image || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400",
        description: description || "Produto de alta qualidade da Loja dos mió amigos."
    };

    products.push(newProduct);

    res.status(201).json({ 
        message: "Produto cadastrado com sucesso!", 
        product: newProduct 
    });
});


app.post("/cart", authenticateToken, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    if (!productId || !quantity) {
        return res.status(400).json({ error: "productId e quantity são obrigatórios" });
    }

    let userCart = carts.find(c => c.userId === userId);

    if (!userCart) {
        userCart = { 
            userId: userId, 
            items: [] 
        };
        carts.push(userCart); 
    }

    const itemIndex = userCart.items.findIndex(item => item.productId === parseInt(productId));

    if (itemIndex > -1) {
        userCart.items[itemIndex].quantity += parseInt(quantity);
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


app.get("/cart", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const userCart = carts.find(c => c.userId === userId);

    if (!userCart || userCart.items.length === 0) {
        return res.json({ 
            items: [], 
            valorTotal: 0 
        });
    }

    let valorTotal = 0;

    const detalheItens = userCart.items.map(item => {
        const produtoInfo = products.find(p => p.id === item.productId);
        const subtotal = produtoInfo ? produtoInfo.price * item.quantity : 0;

        valorTotal += subtotal;

        return {
            productId: item.productId,
            name: produtoInfo ? produtoInfo.name : "Produto Não Encontrado",
            price: produtoInfo ? produtoInfo.price : 0,
            image: produtoInfo ? (produtoInfo.image || "") : "",
            quantity: item.quantity,
            subtotal: Number(subtotal.toFixed(2))
        };
    });

    res.json({
        items: detalheItens,
        valorTotal: Number(valorTotal.toFixed(2))
    });
});

app.delete("/cart/:productId", authenticateToken, (req, res) => {
    const productId = parseInt(req.params.productId);
    const userId = req.user.id;
    const userCart = carts.find(c => c.userId === userId);

    if (!userCart) {
        return res.status(404).json({ error: "Carrinho não encontrado" });
    }

    const itemIndex = userCart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
        return res.status(404).json({ error: "Item não encontrado no carrinho" });
    }

    userCart.items.splice(itemIndex, 1);
    res.json({ message: "Item removido do carrinho com sucesso!", cart: userCart });
});

app.delete("/cart", authenticateToken, (req, res) => {
    const userId = req.user.id;
    const userCart = carts.find(c => c.userId === userId);

    if (userCart) {
        userCart.items = [];
    }

    res.json({ message: "Carrinho esvaziado com sucesso!" });
});
  
app.delete("/products/:id", authenticateToken, authorizeAdmin, (req, res) => {
    const productId = parseInt(req.params.id);

    const productIndex = products.findIndex(p => p.id === productId);

    if (productIndex === -1) {
        return res.status(404).json({ error: "Produto não encontrado no catálogo" });
    }

    products.splice(productIndex, 1);

    res.json({ message: "Produto removido com sucesso do catálogo!" });
});


app.post("/register", async (req, res) => {
    const { email, password, role = 'client' } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
        return res.status(400).json({ error: "Este email já está cadastrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
        id: users.length + 1, 
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role
    };
    
    users.push(newUser);

    res.status(201).json({ message: "Usuário registrado com sucesso!" });
});

app.post("/login", async(req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return res.status(400).json({ error: "Usuário não encontrado" });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).json({ error: "Senha incorreta" });
    }
    
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role 
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

    res.json({ token, role: user.role, email: user.email });
});


app.get('/perfil', authenticateToken, (req, res) => {
    res.json({ message: 'Acesso permitido para clientes e admins', dados: req.user });
});

app.post('/painel-admin', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({ message: 'Bem-vindo ao painel dos administradores!' });
});

// Inicialização de contas demonstrativas pré-configuradas
async function seedDefaultUsers() {
    if (users.length === 0) {
        const adminPass = await bcrypt.hash("admin123", 10);
        users.push({
            id: 1,
            email: "admin@loja.com",
            password: adminPass,
            role: "admin"
        });

        const clientPass = await bcrypt.hash("cliente123", 10);
        users.push({
            id: 2,
            email: "cliente@loja.com",
            password: clientPass,
            role: "client"
        });
        console.log("Contas padrão criadas: admin@loja.com (admin123) | cliente@loja.com (cliente123)");
    }
}

app.listen(3000, async () => {
    await seedDefaultUsers();
    console.log("Servidor rodando na porta 3000");
});
