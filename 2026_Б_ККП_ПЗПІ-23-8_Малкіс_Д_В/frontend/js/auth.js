// Перевірка автентифікації
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && !window.location.href.includes('login.html') && !window.location.href.includes('register.html')) {
        window.location.href = 'login.html';
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', checkAuth);