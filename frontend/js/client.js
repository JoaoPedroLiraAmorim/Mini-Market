document.addEventListener("DOMContentLoaded", async () => {
    
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "client") {
        alert("Acesso não autorizado! Faça login primeiro.");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/perfil", {
            method: "GET",
            headers: {
                
                "Authorization": `Bearer ${token}` 
            }
        });

        const data = await response.json();

        if (response.ok) {
            
            document.getElementById("boas-vindas").innerText = `Olá, ${data.dados.email}!`;
        } else {
            logout();
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
});

function logout() {
    localStorage.clear(); 
    window.location.href = "login.html";
}
