const API_BASE_URL = 'http://localhost:4001/api';

let currentPage = 1;
const itemsPerPage = 10;
let allRoutes = [];
let allVehicles = [];
let selectedRoute = null;
let token = localStorage.getItem('token') || '';

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    await loadVehicles();
    await loadRoutes();
    setupEventListeners();
    setupDateTimeInputs();
    updateStats();
}


async function loadVehicles() {
    try {
        console.log('Запит до API для транспортних засобів...');
        const response = await fetch(`${API_BASE_URL}/routes/vehicles/list`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Отримані дані транспорту:', data);

        const vehicleSelect = document.getElementById('vehicleSelect');
        const vehicleFilter = document.getElementById('vehicleFilter');

        if (!vehicleSelect || !vehicleFilter) {
            console.error('Елементи випадаючих списків не знайдено!');
            return;
        }

        vehicleSelect.innerHTML = '';
        vehicleFilter.innerHTML = '';

        if (data.success && Array.isArray(data.data) && data.data.length) {
            console.log('Структура: {success: true, data: [...]}');
            allVehicles = data.data;
        } else if (Array.isArray(data) && data.length) {
            console.log('Структура: [...] (простий масив)');
            allVehicles = data;
        } else if (data.success && data.data && Array.isArray(data.data)) {
            console.log('Структура: {success: true, data: [...]} (можливо пустий масив)');
            allVehicles = data.data;
        } else {
            console.log('Невідома структура або немає даних:', data);
            allVehicles = [];
        }

        if (allVehicles.length > 0) {
            console.log(`Знайдено ${allVehicles.length} транспортних засобів`);
            
            vehicleSelect.innerHTML = '<option value="">Оберіть транспортний засіб</option>';
            vehicleFilter.innerHTML = '<option value="">Всі транспортні засоби</option>';

            allVehicles.forEach(v => {

                const displayText = `${v.plate_number || 'Без номеру'} - ${v.model || 'Невідома модель'}`;
                
                const opt = document.createElement('option');
                opt.value = v.vehicle_id;
                opt.textContent = displayText;
                vehicleSelect.appendChild(opt);
                
                const filterOpt = document.createElement('option');
                filterOpt.value = v.vehicle_id;
                filterOpt.textContent = displayText;
                vehicleFilter.appendChild(filterOpt);
            });
            
            showNotification(`Завантажено ${allVehicles.length} транспортних засобів`, 'success');
        } else {
            console.log('Транспортні засоби не знайдені');
            vehicleSelect.innerHTML = '<option value="">Немає доступних транспортних засобів</option>';
            vehicleFilter.innerHTML = '<option value="">Немає транспорту</option>';
            showNotification('Спочатку додайте транспортні засоби в розділі "Транспорт"', 'info');
        }
    } catch (err) {
        console.error('Помилка завантаження транспорту:', err);
        
        const vehicleSelect = document.getElementById('vehicleSelect');
        const vehicleFilter = document.getElementById('vehicleFilter');
        
        if (vehicleSelect && vehicleFilter) {
            vehicleSelect.innerHTML = '<option value="">Оберіть транспортний засіб</option>';
            vehicleFilter.innerHTML = '<option value="">Всі транспортні засоби</option>';
            
            const mockVehicles = [
                { vehicle_id: 1, plate_number: 'АА1234ВС', model: 'Volvo FH16', type: 'Вантажівка' },
                { vehicle_id: 2, plate_number: 'ВС5678АА', model: 'MAN TGX', type: 'Вантажівка' },
                { vehicle_id: 3, plate_number: 'КА9012МН', model: 'Scania R450', type: 'Вантажівка' }
            ];
            
            mockVehicles.forEach(v => {
                const displayText = `${v.plate_number} - ${v.model}`;
                
                const opt = document.createElement('option');
                opt.value = v.vehicle_id;
                opt.textContent = displayText;
                vehicleSelect.appendChild(opt);
                
                const filterOpt = document.createElement('option');
                filterOpt.value = v.vehicle_id;
                filterOpt.textContent = displayText;
                vehicleFilter.appendChild(filterOpt);
            });
            
            showNotification('Використано тестові дані', 'info');
        }
    }
}

async function loadRoutes() {
    try {
        showLoading(true);
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Запит до API для маршрутів...');
        const res = await fetch(`${API_BASE_URL}/routes`, {
            headers: headers
        });
        
        if (!res.ok) {
            throw new Error(`Не вдалося завантажити маршрути: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('Отримані дані маршрутів:', data);
        
        if (data.success && data.data && Array.isArray(data.data)) {
            allRoutes = data.data;
            console.log(`Завантажено ${allRoutes.length} маршрутів`);
        } else if (Array.isArray(data)) {
            allRoutes = data;
            console.log(`Завантажено ${allRoutes.length} маршрутів (простий масив)`);
        } else {
            allRoutes = [];
            console.log('Невідома структура даних маршрутів:', data);
        }
        
        renderRouteTable();
        renderRouteDropdown();
        updateStats();
        
        showNotification(`Завантажено ${allRoutes.length} маршрутів`, 'success');
    } catch (err) {
        console.error('Помилка завантаження маршрутів:', err);
        showNotification('Помилка завантаження маршрутів', 'error');
        allRoutes = [];
        renderRouteTable();
    } finally {
        showLoading(false);
    }
}

function getFilteredRoutes() {
    let routes = [...allRoutes];

    const status = document.getElementById('statusFilter')?.value;
    const vehicle = document.getElementById('vehicleFilter')?.value;
    const date = document.getElementById('dateFilter')?.value;
    const search = document.getElementById('searchInput')?.value.toLowerCase();

    if (status && status !== 'all') {
        routes = routes.filter(r => r.status === status);
    }
    
    if (vehicle && vehicle !== 'all') {
        routes = routes.filter(r => String(r.vehicle_id) === vehicle);
    }
    
    if (date) {
        routes = routes.filter(r => {
            const routeDate = new Date(r.planned_start).toISOString().slice(0, 10);
            return routeDate === date;
        });
    }
    
    if (search) {
        routes = routes.filter(r =>
            (r.start_point || '').toLowerCase().includes(search) ||
            (r.end_point || '').toLowerCase().includes(search) ||
            (r.plate_number || '').toLowerCase().includes(search) ||
            (r.model || '').toLowerCase().includes(search)
        );
    }

    const sort = document.getElementById('sortFilter')?.value || 'newest';
    routes.sort((a, b) => {
        const dateA = new Date(a.planned_start);
        const dateB = new Date(b.planned_start);
        return sort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return routes;
}

function renderRouteTable() {
    const filtered = getFilteredRoutes();
    const tbody = document.getElementById('routesTableBody');

    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr><td colspan="7" style="text-align:center;padding:40px;">
                Маршрутів не знайдено
            </td></tr>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filtered.slice(start, start + itemsPerPage);

    tbody.innerHTML = pageData.map(route => renderRouteRow(route)).join('');

    const showingCount = document.getElementById('showingCount');
    const totalRoutes = document.getElementById('totalRoutes');
    
    if (showingCount) showingCount.textContent = pageData.length;
    if (totalRoutes) totalRoutes.textContent = filtered.length;

    updatePagination(filtered.length);
}

async function onRouteSelect() {
    const routeSelect = document.getElementById('routeSelect');
    const vehicleInfo = document.getElementById('vehicleInfo');
    const routeInfo = document.getElementById('routeInfo');
    const plannedStart = document.getElementById('plannedStart');
    const plannedEnd = document.getElementById('plannedEnd');
    
    if (!routeSelect || !vehicleInfo || !routeInfo || !plannedStart || !plannedEnd) return;
    
    const id = parseInt(routeSelect.value);
    if (!id) return;

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${API_BASE_URL}/routes/${id}`, {
            headers: headers
        });
        
        if (!res.ok) {
            throw new Error('Не вдалося завантажити маршрут');
        }
        
        const data = await res.json();
        
        const route = data.success ? data.data : data;
        
        if (route) {
            selectedRoute = route;
            vehicleInfo.value = route.plate_number || 'Невідомо';
            routeInfo.value = `${route.start_point} → ${route.end_point}`;
            plannedStart.value = new Date(route.planned_start).toLocaleString('uk-UA');
            plannedEnd.value = new Date(route.planned_end).toLocaleString('uk-UA');
        }
    } catch(err) {
        console.error('Помилка завантаження маршруту:', err);
        showNotification(err.message, 'error');
    }
}

function renderRouteRow(route) {
    const start = new Date(route.planned_start);
    const end = new Date(route.planned_end);
    const dur = Math.max(0, end - start);

    const h = Math.floor(dur / 3600000);
    const m = Math.floor((dur % 3600000) / 60000);

    const statusMap = {
        planned: ['Запланований', 'status-planned', 'fa-clock'],
        active: ['Активний', 'status-active', 'fa-play-circle'],
        completed: ['Завершений', 'status-completed', 'fa-check-circle'],
        cancelled: ['Скасований', 'status-cancelled', 'fa-times-circle']
    };

    const [text, cls, icon] = statusMap[route.status] || statusMap.planned;

    const vehicleInfo = route.plate_number && route.model 
        ? `${route.plate_number} - ${route.model}`
        : route.plate_number || route.model || '—';

    return `<tr>
        <td><strong>#${route.route_id}</strong></td>
        <td>${vehicleInfo}</td>
        <td>${route.start_point} → ${route.end_point}</td>
        <td>${start.toLocaleString('uk-UA')}</td>
        <td>${h} год ${m} хв</td>
        <td>
            <span class="status-badge ${cls}">
                <i class="fas ${icon}"></i> ${text}
            </span>
        </td>
        <td>
            <button class="btn-action btn-delete" onclick="deleteRoute(${route.route_id})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    </tr>`;
}

function renderRouteDropdown() {
    const routeSelect = document.getElementById('routeSelect');
    if (!routeSelect) return;

    routeSelect.innerHTML = '<option value="">Оберіть маршрут</option>';

    allRoutes.forEach(route => {
        const opt = document.createElement('option');
        opt.value = route.route_id;
        const vehicleInfo = route.plate_number && route.model 
            ? `${route.plate_number} - ${route.model}`
            : route.plate_number || route.model || '—';
        opt.textContent = `${route.start_point} → ${route.end_point} (${vehicleInfo})`;
        routeSelect.appendChild(opt);
    });
}

async function createRoute() {
    const vehicleSelect = document.getElementById('vehicleSelect');
    const startPoint = document.getElementById('startPoint');
    const endPoint = document.getElementById('endPoint');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    const statusSelect = document.getElementById('statusSelect');
    
    if (!vehicleSelect || !startPoint || !endPoint || !startTime || !endTime || !statusSelect) {
        showNotification('Не всі поля форми знайдено', 'error');
        return;
    }
    
    const payload = {
        vehicle_id: vehicleSelect.value || null,
        start_point: startPoint.value,
        end_point: endPoint.value,
        planned_start: startTime.value,
        planned_end: endTime.value,
        status: statusSelect.value || 'planned'
    };

    if (!payload.start_point || !payload.end_point || !payload.planned_start || !payload.planned_end) {
        showNotification('Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    if (new Date(payload.planned_end) <= new Date(payload.planned_start)) {
        showNotification('Час завершення повинен бути пізніше часу початку', 'error');
        return;
    }

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${API_BASE_URL}/routes`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Помилка створення маршруту');
        }

        closeModal();
        await loadRoutes();
        showNotification('Маршрут створено', 'success');
        
        if (startPoint) startPoint.value = '';
        if (endPoint) endPoint.value = '';
        if (vehicleSelect) vehicleSelect.value = '';
        if (statusSelect) statusSelect.value = 'planned';
        
        setupDateTimeInputs();
    } catch (err) {
        console.error('Помилка створення маршруту:', err);
        showNotification(err.message, 'error');
    }
}

async function deleteRoute(id) {
    if (!confirm('Видалити маршрут?')) return;

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch(`${API_BASE_URL}/routes/${id}`, {
            method: 'DELETE',
            headers: headers
        });
        
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Помилка видалення');
        }

        await loadRoutes();
        showNotification('Маршрут видалено', 'success');
    } catch (err) {
        console.error('Помилка видалення маршруту:', err);
        showNotification(err.message, 'error');
    }
}

function updateStats() {
    const plannedCount = document.getElementById('plannedCount');
    const activeCount = document.getElementById('activeCount');
    const completedCount = document.getElementById('completedCount');
    const totalCount = document.getElementById('totalCount');
    
    if (!plannedCount || !activeCount || !completedCount || !totalCount) return;
    
    plannedCount.textContent = allRoutes.filter(r => r.status === 'planned').length;
    activeCount.textContent = allRoutes.filter(r => r.status === 'active').length;
    completedCount.textContent = allRoutes.filter(r => r.status === 'completed').length;
    totalCount.textContent = allRoutes.length;
}

function updatePagination(total) {
    const pages = Math.ceil(total / itemsPerPage);
    const currentPageEl = document.getElementById('currentPage');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= pages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderRouteTable();
    }
}

function nextPage() {
    const total = getFilteredRoutes().length;
    const pages = Math.ceil(total / itemsPerPage);
    
    if (currentPage < pages) {
        currentPage++;
        renderRouteTable();
    }
}

function setupEventListeners() {
    // Фільтри
    ['statusFilter', 'vehicleFilter', 'dateFilter', 'sortFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                currentPage = 1;
                renderRouteTable();
            });
        }
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                renderRouteTable();
            }, 300);
        });
    }

    const routeForm = document.getElementById('routeForm');
    if (routeForm) {
        routeForm.addEventListener('submit', e => {
            e.preventDefault();
            createRoute();
        });
    }

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', prevPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);

    const createBtn = document.getElementById('createRouteBtn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateModal);
    } else {
        const openModalBtn = document.querySelector('.btn-primary');
        if (openModalBtn && openModalBtn.textContent.includes('Створити')) {
            openModalBtn.addEventListener('click', openCreateModal);
        }
    }
}

function setupDateTimeInputs() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');

    if (startInput) startInput.value = formatDateTime(now);
    if (endInput) endInput.value = formatDateTime(tomorrow);
}

function showLoading(show) {
    const tbody = document.getElementById('routesTableBody');
    if (!tbody) return;
    
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:40px;">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Завантаження...
                    </div>
                </td>
            </tr>`;
    }
}

function showNotification(msg, type = 'info') {
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = msg;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-family: Arial, sans-serif;
    `;
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else if (type === 'error') {
        notification.style.background = '#dc3545';
    } else {
        notification.style.background = '#17a2b8';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 500);
        }
    }, 3000);
}

function openCreateModal() {
    const modal = document.getElementById('createRouteModal');
    if (modal) {
        modal.classList.add('active');
        setupDateTimeInputs();
    }
}

function closeModal() {
    const modal = document.getElementById('createRouteModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function logout() {
    if (confirm('Ви впевнені, що хочете вийти?')) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}