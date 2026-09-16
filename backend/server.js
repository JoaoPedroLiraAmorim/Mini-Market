const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "Pikachu123";

const users = []; 
const products = [];
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

app.post("/products", authenticateToken, authorizeAdmin, (req, res) => {
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const newProduct = {
        id: products.length + 1, 
        name: name,
        price: Number(price)    
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
            quantity: item.quantity,
            subtotal: subtotal
        };
    });

    res.json({
        items: detalheItens,
        valorTotal: Number(valorTotal.toFixed(2))
    });
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

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
        id: users.length + 1, 
        email,
        password: hashedPassword,
        role: role
    };
    
    users.push(newUser);

    res.status(201).json({ message: "Usuário registrado com sucesso!" });
});

app.post("/login", async(req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
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

    res.json({ token, role: user.role });
});


app.get('/perfil', authenticateToken, (req, res) => {
    res.json({ message: 'Acesso permitido para clientes e admins', dados: req.user });
});

app.post('/painel-admin', authenticateToken, authorizeAdmin, (req, res) => {
    res.json({ message: 'Bem-vindo ao painel dos administradores!' });
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});
