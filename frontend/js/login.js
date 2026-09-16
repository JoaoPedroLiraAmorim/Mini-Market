
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form"); 

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault(); 

        
        const email = document.getElementById("email-input").value;
        const password = document.getElementById("password-input").value;

        try {
          
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
               
                alert(data.error || "Erro ao fazer login");
                return;
            }

            
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role);

            
            if (data.role === "admin") {
                window.location.href = "painel-admin.html";
            } else if (data.role === "client") {
                window.location.href = "dashboard-cliente.html"; 
            }

        } catch (error) {
            console.error("Erro na requisição:", error);
            alert("Não foi possível conectar ao servidor.");
        }
    });
});
