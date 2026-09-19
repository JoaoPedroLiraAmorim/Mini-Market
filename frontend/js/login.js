document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const alertBox = document.getElementById("auth-alert");

    // Toggle Password Buttons
    setupPasswordToggle("toggle-login-pass", "login-password");
    setupPasswordToggle("toggle-reg-pass", "reg-password");

    // Check URL parameters for ?mode=register
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mode") === "register") {
        switchToRegister();
    }

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener("click", () => switchToLogin());
        tabRegister.addEventListener("click", () => switchToRegister());
    }

    function switchToLogin() {
        tabLogin.classList.add("active");
        tabRegister.classList.remove("active");
        loginForm.style.display = "block";
        registerForm.style.display = "none";
        hideAlert();
    }

    function switchToRegister() {
        tabRegister.classList.add("active");
        tabLogin.classList.remove("active");
        loginForm.style.display = "none";
        registerForm.style.display = "block";
        hideAlert();
    }

    function showAlert(message, type = "danger") {
        alertBox.className = `alert-box alert-${type} show`;
        alertBox.innerHTML = `<div>${message}</div>`;
    }

    function hideAlert() {
        alertBox.className = "alert-box";
        alertBox.innerHTML = "";
    }

    function setupPasswordToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener("click", () => {
                const isPassword = input.type === "password";
                input.type = isPassword ? "text" : "password";
                btn.innerText = isPassword ? "Ocultar" : "Ver";
            });
        }
    }

    // Handle Login Submit
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideAlert();

            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const submitBtn = document.getElementById("login-btn");

            submitBtn.disabled = true;
            submitBtn.innerText = "Entrando...";

            try {
                const response = await fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    showAlert(data.error || "Erro ao efetuar login. Verifique suas credenciais.");
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Entrar";
                    return;
                }

                // Save auth info
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.role);
                localStorage.setItem("email", data.email || email);

                showAlert("Login realizado com sucesso! Redirecionando...", "success");

                setTimeout(() => {
                    if (data.role === "admin") {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "client.html";
                    }
                }, 800);

            } catch (err) {
                console.error("Erro na conexão com o servidor:", err);
                showAlert("Não foi possível conectar ao servidor. Verifique se o backend está em execução.");
                submitBtn.disabled = false;
                submitBtn.innerText = "Entrar";
            }
        });
    }

    // Handle Register Submit
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideAlert();

            const email = document.getElementById("reg-email").value.trim();
            const password = document.getElementById("reg-password").value;
            const role = document.getElementById("reg-role").value;
            const submitBtn = document.getElementById("register-btn");

            if (password.length < 6) {
                showAlert("A senha deve ter pelo menos 6 caracteres.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerText = "Cadastrando...";

            try {
                const response = await fetch("http://localhost:3000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, role })
                });

                const data = await response.json();

                if (!response.ok) {
                    showAlert(data.error || "Erro ao registrar usuário.");
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Criar Conta";
                    return;
                }

                showAlert("Conta criada com sucesso! Agora você já pode fazer login.", "success");
                submitBtn.disabled = false;
                submitBtn.innerText = "Criar Conta";

                // Pre-fill login email and switch to login tab
                document.getElementById("login-email").value = email;
                setTimeout(() => {
                    switchToLogin();
                    document.getElementById("login-password").focus();
                }, 1200);

            } catch (err) {
                console.error("Erro na requisição:", err);
                showAlert("Não foi possível conectar ao servidor.");
                submitBtn.disabled = false;
                submitBtn.innerText = "Criar Conta";
            }
        });
    }
});
