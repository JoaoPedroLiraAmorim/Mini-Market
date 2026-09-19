document.addEventListener("DOMContentLoaded", () => {
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const alertBox = document.getElementById("auth-alert");

    setupPasswordToggle("toggle-login-pass", "login-password");
    setupPasswordToggle("toggle-reg-pass", "reg-password");

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mode") === "register") switchToRegister();

    tabLogin?.addEventListener("click", switchToLogin);
    tabRegister?.addEventListener("click", switchToRegister);

    function switchToLogin() {
        tabLogin?.classList.add("active");
        tabRegister?.classList.remove("active");
        if (loginForm) loginForm.style.display = "block";
        if (registerForm) registerForm.style.display = "none";
        hideAlert();
    }

    function switchToRegister() {
        tabRegister?.classList.add("active");
        tabLogin?.classList.remove("active");
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "block";
        hideAlert();
    }

    function showAlert(message, type = "danger") {
        if (!alertBox) return;
        alertBox.className = `alert-box alert-${type} show`;
        alertBox.innerHTML = `<div>${message}</div>`;
    }

    function hideAlert() {
        if (!alertBox) return;
        alertBox.className = "alert-box";
        alertBox.innerHTML = "";
    }

    function setupPasswordToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (btn && input) {
            btn.addEventListener("click", () => {
                const isPass = input.type === "password";
                input.type = isPass ? "text" : "password";
                btn.innerText = isPass ? "Ocultar" : "Ver";
            });
        }
    }

    loginForm?.addEventListener("submit", async e => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const btn = document.getElementById("login-btn");

        btn.disabled = true;
        btn.innerText = "Entrando...";

        try {
            const res = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                showAlert(data.error || "Erro ao efetuar login.");
                btn.disabled = false;
                btn.innerText = "Entrar";
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role);
            localStorage.setItem("email", data.email || email);

            showAlert("Login realizado com sucesso! Redirecionando...", "success");
            setTimeout(() => {
                window.location.href = data.role === "admin" ? "admin.html" : "loja.html";
            }, 700);
        } catch {
            showAlert("Não foi possível conectar ao servidor.");
            btn.disabled = false;
            btn.innerText = "Entrar";
        }
    });

    registerForm?.addEventListener("submit", async e => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById("reg-email").value.trim();
        const password = document.getElementById("reg-password").value;
        const role = document.getElementById("reg-role").value;
        const btn = document.getElementById("register-btn");

        if (password.length < 6) return showAlert("A senha deve ter pelo menos 6 caracteres.");

        btn.disabled = true;
        btn.innerText = "Cadastrando...";

        try {
            const res = await fetch("http://localhost:3000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role })
            });
            const data = await res.json();
            if (!res.ok) {
                showAlert(data.error || "Erro ao registrar usuário.");
                btn.disabled = false;
                btn.innerText = "Criar Conta";
                return;
            }

            showAlert("Conta criada com sucesso! Você já pode entrar.", "success");
            btn.disabled = false;
            btn.innerText = "Criar Conta";

            const loginEmailInput = document.getElementById("login-email");
            if (loginEmailInput) loginEmailInput.value = email;
            setTimeout(switchToLogin, 1000);
        } catch {
            showAlert("Erro ao conectar ao servidor.");
            btn.disabled = false;
            btn.innerText = "Criar Conta";
        }
    });
});
