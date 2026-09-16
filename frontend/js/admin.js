document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
        alert("Acesso exclusivo para administradores!");
        window.location.href = "login.html";
        return;
    }

    console.log("Admin autenticado com sucesso!");
});
