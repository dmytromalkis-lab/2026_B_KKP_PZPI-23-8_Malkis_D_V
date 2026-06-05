class ReportManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:4001/api';
        this.reportsHistory = JSON.parse(localStorage.getItem('reportsHistory')) || [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadHistory();
    }
    
    initializeElements() {
        // Кнопки генерації
        this.generateButtons = document.querySelectorAll('.btn-generate');
        this.loadingModal = document.getElementById('loadingModal');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.previewContent = document.getElementById('previewContent');
        this.reportsHistoryContainer = document.getElementById('reportsHistory');
        
        // Фільтри
        this.routesStatus = document.getElementById('routesStatus');
        this.routesDateFrom = document.getElementById('routesDateFrom');
        this.routesDateTo = document.getElementById('routesDateTo');
        this.vehiclesMonth = document.getElementById('vehiclesMonth');
        this.vehiclesYear = document.getElementById('vehiclesYear');
        this.driversStatus = document.getElementById('driversStatus');
        this.generalPeriod = document.getElementById('generalPeriod');
        this.generalDate = document.getElementById('generalDate');
    }
    
    setupEventListeners() {
        // Кнопки генерації
        this.generateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const reportType = e.currentTarget.dataset.report;
                this.generateReport(reportType);
            });
        });
        
        // Оновлення попереднього перегляду при зміні фільтрів
        const filterInputs = [
            this.routesStatus, this.routesDateFrom, this.routesDateTo,
            this.vehiclesMonth, this.vehiclesYear, this.driversStatus,
            this.generalPeriod, this.generalDate
        ];
        
        filterInputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => this.updatePreview());
            }
        });
        
        // Завантаження звітів з історії
        document.addEventListener('click', (e) => {
            if (e.target.closest('.history-item .btn')) {
                const historyItem = e.target.closest('.history-item');
                const reportUrl = historyItem.dataset.url;
                if (reportUrl) {
                    this.downloadReport(reportUrl);
                }
            }
        });
    }
    
    async generateReport(reportType) {
        let url = '';
        let params = {};
        
        switch (reportType) {
            case 'routes':
                params = {
                    startDate: this.routesDateFrom.value,
                    endDate: this.routesDateTo.value,
                    status: this.routesStatus.value
                };
                url = this.buildUrl('/reports/routes/pdf', params);
                break;
                
            case 'vehicles':
                params = {
                    month: this.vehiclesMonth.value,
                    year: this.vehiclesYear.value
                };
                url = this.buildUrl('/reports/vehicles/pdf', params);
                break;
                
            case 'drivers':
                url = `${this.apiBaseUrl}/reports/drivers/pdf`;
                break;
                
            case 'general':
                this.generateGeneralReport();
                return;
        }
        
        if (!url) return;
        
        this.showLoading(`Генерація ${this.getReportTitle(reportType)}...`);
        
        try {
            // Відкриваємо PDF в новому вікні або завантажуємо
            window.open(url, '_blank');
            
            // Додаємо в історію
            this.addToHistory(reportType, params);
            
            this.showSuccess('Звіт успішно згенеровано!');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showError('Не вдалося згенерувати звіт');
        } finally {
            this.hideLoading();
        }
    }
    
    generateGeneralReport() {
        // Створюємо комплексний звіт
        const period = this.generalPeriod.value;
        const date = this.generalDate.value || new Date().toISOString().split('T')[0];
        
        this.showLoading('Генерація комплексного звіту...');
        
        // Відкриваємо кілька звітів в нових вкладках
        const routesUrl = this.buildUrl('/reports/routes/pdf', {
            startDate: this.calculateDateRange(period, date).start,
            endDate: this.calculateDateRange(period, date).end
        });
        
        const vehiclesUrl = `${this.apiBaseUrl}/reports/vehicles/pdf`;
        const driversUrl = `${this.apiBaseUrl}/reports/drivers/pdf`;
        
        // Відкриваємо всі звіти
        window.open(routesUrl, '_blank');
        setTimeout(() => window.open(vehiclesUrl, '_blank'), 100);
        setTimeout(() => window.open(driversUrl, '_blank'), 200);
        
        this.addToHistory('general', { period, date });
        this.hideLoading();
    }
    
    async updatePreview() {
        try {
            // Отримуємо дані для попереднього перегляду
            const previewData = await this.getPreviewData();
            this.renderPreview(previewData);
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }
    
    async getPreviewData() {
        // Можна додати реальні дані для попереднього перегляду
        return {
            routes: {
                total: 24,
                planned: 8,
                active: 12,
                completed: 3,
                cancelled: 1
            },
            vehicles: {
                total: 15,
                inUse: 10,
                available: 5
            },
            drivers: {
                total: 18,
                active: 12,
                inactive: 3,
                vacation: 3
            }
        };
    }
    
    renderPreview(data) {
        if (!this.previewContent) return;
        
        this.previewContent.innerHTML = `
            <div class="preview-content">
                <h3>Попередній перегляд статистики</h3>
                
                <div class="preview-section">
                    <h4><i class="fas fa-route"></i> Маршрути</h4>
                    <div class="preview-stat">
                        <span class="stat-label">Всього маршрутів:</span>
                        <span class="stat-value">${data.routes.total}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Заплановано:</span>
                        <span class="stat-value">${data.routes.planned}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Активні:</span>
                        <span class="stat-value">${data.routes.active}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Завершено:</span>
                        <span class="stat-value">${data.routes.completed}</span>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4><i class="fas fa-truck"></i> Транспорт</h4>
                    <div class="preview-stat">
                        <span class="stat-label">Всього ТЗ:</span>
                        <span class="stat-value">${data.vehicles.total}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Використовуються:</span>
                        <span class="stat-value">${data.vehicles.inUse}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Доступні:</span>
                        <span class="stat-value">${data.vehicles.available}</span>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4><i class="fas fa-users"></i> Водії</h4>
                    <div class="preview-stat">
                        <span class="stat-label">Всього водіїв:</span>
                        <span class="stat-value">${data.drivers.total}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">
                            <span class="status-indicator status-active">
                                <span class="dot"></span> Активні
                            </span>
                        </span>
                        <span class="stat-value">${data.drivers.active}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">
                            <span class="status-indicator status-inactive">
                                <span class="dot"></span> Неактивні
                            </span>
                        </span>
                        <span class="stat-value">${data.drivers.inactive}</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">
                            <span class="status-indicator status-vacation">
                                <span class="dot"></span> Відпустка
                            </span>
                        </span>
                        <span class="stat-value">${data.drivers.vacation}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    addToHistory(reportType, params) {
        const report = {
            id: Date.now(),
            type: reportType,
            title: this.getReportTitle(reportType),
            params: params,
            date: new Date().toISOString(),
            url: this.buildReportUrl(reportType, params)
        };
        
        this.reportsHistory.unshift(report);
        
        // Обмежуємо історію 10 записами
        if (this.reportsHistory.length > 10) {
            this.reportsHistory = this.reportsHistory.slice(0, 10);
        }
        
        localStorage.setItem('reportsHistory', JSON.stringify(this.reportsHistory));
        this.loadHistory();
    }
    
    loadHistory() {
        if (!this.reportsHistoryContainer) return;
        
        if (this.reportsHistory.length === 0) {
            this.reportsHistoryContainer.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-history" style="font-size: 48px; color: #ddd; margin-bottom: 16px;"></i>
                    <p>Історія звітів порожня</p>
                    <small>Створіть перший звіт</small>
                </div>
            `;
            return;
        }
        
        this.reportsHistoryContainer.innerHTML = this.reportsHistory.map(report => {
            const date = new Date(report.date).toLocaleString('uk-UA');
            const paramsText = this.getParamsText(report.type, report.params);
            
            return `
                <div class="history-item" data-url="${report.url}">
                    <div class="history-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="history-content">
                        <h4>${report.title}</h4>
                        <p>${paramsText}</p>
                        <small>${date}</small>
                    </div>
                    <button class="btn btn-secondary btn-sm">
                        <i class="fas fa-download"></i> Завантажити
                    </button>
                </div>
            `;
        }).join('');
    }
    
    downloadReport(url) {
        window.open(url, '_blank');
    }
    
    buildUrl(endpoint, params) {
        const url = new URL(`${this.apiBaseUrl}${endpoint}`);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.append(key, value);
            }
        });
        
        return url.toString();
    }
    
    buildReportUrl(reportType, params) {
        switch (reportType) {
            case 'routes':
                return this.buildUrl('/reports/routes/pdf', params);
            case 'vehicles':
                return this.buildUrl('/reports/vehicles/pdf', params);
            case 'drivers':
                return `${this.apiBaseUrl}/reports/drivers/pdf`;
            default:
                return '';
        }
    }
    
    getReportTitle(reportType) {
        const titles = {
            'routes': 'Звіт по маршрутах',
            'vehicles': 'Звіт по транспорту',
            'drivers': 'Звіт по водіям',
            'general': 'Комплексний звіт'
        };
        
        return titles[reportType] || 'Звіт';
    }
    
    getParamsText(reportType, params) {
        switch (reportType) {
            case 'routes':
                let text = 'За весь період';
                if (params.startDate || params.endDate || params.status) {
                    const parts = [];
                    if (params.status) parts.push(`Статус: ${params.status}`);
                    if (params.startDate) parts.push(`Від: ${params.startDate}`);
                    if (params.endDate) parts.push(`До: ${params.endDate}`);
                    text = parts.join(', ');
                }
                return text;
                
            case 'vehicles':
                if (params.month && params.year) {
                    return `За ${params.month}.${params.year}`;
                }
                return 'За весь період';
                
            case 'general':
                return `Період: ${params.period}, Дата: ${params.date}`;
                
            default:
                return 'Без фільтрів';
        }
    }
    
    calculateDateRange(period, date) {
        const now = new Date(date);
        const start = new Date(now);
        
        switch (period) {
            case 'day':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                start.setDate(now.getDate() - 7);
                break;
            case 'month':
                start.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                start.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        return {
            start: start.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0]
        };
    }
    
    showLoading(message) {
        if (this.loadingMessage) {
            this.loadingMessage.textContent = message;
        }
        if (this.loadingModal) {
            this.loadingModal.classList.add('active');
        }
    }
    
    hideLoading() {
        setTimeout(() => {
            if (this.loadingModal) {
                this.loadingModal.classList.remove('active');
            }
        }, 500);
    }
    
    showSuccess(message) {
        // Можна використовувати toast notification
        console.log('Success:', message);
    }
    
    showError(message) {
        alert(`Помилка: ${message}`);
    }
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    window.reportManager = new ReportManager();
    window.reportManager.updatePreview();
});