const db = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const FONT_PATHS = [
    'C:/Windows/Fonts/arial.ttf',          
    'C:/Windows/Fonts/times.ttf',          
    '/System/Library/Fonts/Helvetica.ttc',  
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', 
    path.join(__dirname, '../../fonts/DejaVuSans.ttf') 
];

let availableFont = null;
for (const fontPath of FONT_PATHS) {
    if (fs.existsSync(fontPath)) {
        availableFont = fontPath;
        console.log('✅ Знайдено шрифт:', fontPath);
        break;
    }
}

if (!availableFont) {
    console.error('❌ Жоден шрифт не знайдено! Кирилиця не буде підтримуватись.');
}

const reportController = {
    generateDriversPDF: async (req, res) => {
        try {
            const database = db.getDB();
            
            const { status } = req.query;
            
            let query = `
                SELECT d.*, v.plate_number 
                FROM drivers d
                LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
            `;
            let params = [];
            
            if (status) {
                query += ` WHERE d.status = ?`;
                params.push(status);
            }
            
            query += ` ORDER BY d.name`;
            
            const [drivers] = await database.execute(query, params);

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=drivers_${Date.now()}.pdf`);
            
            doc.pipe(res);

            if (availableFont) {
                doc.registerFont('MainFont', availableFont);
                doc.font('MainFont');
            }

            doc.fontSize(20).text('ЗВІТ ПО ВОДІЯХ', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(10).text(`Дата: ${new Date().toLocaleString('uk-UA')}`, { align: 'center' });
            if (status) {
                doc.text(`Статус: ${status}`, { align: 'center' });
            }
            doc.text(`Всього водіїв: ${drivers.length}`, { align: 'center' });
            doc.moveDown();

            if (drivers.length === 0) {
                doc.text('Немає даних для відображення', { align: 'center' });
                doc.end();
                return;
            }

            let y = doc.y;
            const startX = 50;
            
            doc.fontSize(10);
            doc.text('№', startX, y);
            doc.text('ПІБ', startX + 40, y);
            doc.text('Контакт', startX + 180, y);
            doc.text('Транспорт', startX + 320, y);
            doc.text('Статус', startX + 450, y);
            
            y += 20;
            doc.moveTo(startX, y).lineTo(startX + 550, y).stroke();
            y += 10;

            drivers.forEach((driver, i) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    doc.fontSize(10);
                }
                
                doc.text((i + 1).toString(), startX, y);
                doc.text((driver.name || '—').substring(0, 30), startX + 40, y);
                doc.text((driver.contact || '—').substring(0, 20), startX + 180, y);
                doc.text((driver.plate_number || '—').substring(0, 15), startX + 320, y);
                
                let statusText = driver.status === 'active' ? 'Активний' : 
                                driver.status === 'vacation' ? 'Відпустка' : 'Неактивний';
                doc.text(statusText, startX + 450, y);
                
                y += 20;
            });

            doc.end();

        } catch (error) {
            console.error('Error generating drivers PDF:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Помилка генерації PDF: ' + error.message });
            }
        }
    },

    generateVehiclesPDF: async (req, res) => {
        try {
            const database = db.getDB();

            const { month, year } = req.query;
            
            let query = `
                SELECT v.*, d.name as driver_name
                FROM vehicles v
                LEFT JOIN drivers d ON v.vehicle_id = d.vehicle_id
            `;
            let params = [];

            if (year) {
                query += ` WHERE v.year = ?`;
                params.push(year);
            }
            
            query += ` ORDER BY v.plate_number`;
            
            const [vehicles] = await database.execute(query, params);

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=vehicles_${Date.now()}.pdf`);
            
            doc.pipe(res);

            if (availableFont) {
                doc.registerFont('MainFont', availableFont);
                doc.font('MainFont');
            }

            doc.fontSize(20).text('ЗВІТ ПО ТРАНСПОРТНИХ ЗАСОБАХ', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(10).text(`Дата: ${new Date().toLocaleString('uk-UA')}`, { align: 'center' });
            if (month) doc.text(`Місяць: ${month}`, { align: 'center' });
            if (year) doc.text(`Рік: ${year}`, { align: 'center' });
            doc.text(`Всього транспорту: ${vehicles.length}`, { align: 'center' });
            doc.moveDown();

            if (vehicles.length === 0) {
                doc.text('Немає даних для відображення', { align: 'center' });
                doc.end();
                return;
            }

            let y = doc.y;
            const startX = 50;
            
            doc.fontSize(10);
            doc.text('№', startX, y);
            doc.text('Номер', startX + 35, y);
            doc.text('Модель', startX + 130, y);
            doc.text('Тип', startX + 250, y);
            doc.text('Рік', startX + 320, y);
            doc.text('Водій', startX + 380, y);
            
            y += 20;
            doc.moveTo(startX, y).lineTo(startX + 550, y).stroke();
            y += 10;

            vehicles.forEach((vehicle, i) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    doc.fontSize(10);
                }
                
                doc.text((i + 1).toString(), startX, y);
                doc.text((vehicle.plate_number || '—').substring(0, 10), startX + 35, y);
                doc.text((vehicle.model || '—').substring(0, 20), startX + 130, y);
                doc.text((vehicle.type || '—').substring(0, 15), startX + 250, y);
                doc.text(vehicle.year ? vehicle.year.toString() : '—', startX + 320, y);
                doc.text((vehicle.driver_name || '—').substring(0, 20), startX + 380, y);
                
                y += 20;
            });

            doc.end();

        } catch (error) {
            console.error('Error generating vehicles PDF:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Помилка генерації PDF: ' + error.message });
            }
        }
    },

    generateRoutesPDF: async (req, res) => {
        try {
            const database = db.getDB();
            
            const { startDate, endDate, status, limit = 100 } = req.query;
            
            let query = `
                SELECT r.*, v.plate_number
                FROM routes r
                LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
                WHERE 1=1
            `;
            let params = [];
            
            if (status) {
                query += ` AND r.status = ?`;
                params.push(status);
            }

            if (startDate) {
                query += ` AND DATE(r.planned_start) >= ?`;
                params.push(startDate);
            }
            
            if (endDate) {
                query += ` AND DATE(r.planned_start) <= ?`;
                params.push(endDate);
            }
            
            query += ` ORDER BY r.planned_start DESC LIMIT ?`;
            params.push(parseInt(limit));
            
            const [routes] = await database.execute(query, params);

            const doc = new PDFDocument({ margin: 50 });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=routes_${Date.now()}.pdf`);
            
            doc.pipe(res);

            if (availableFont) {
                doc.registerFont('MainFont', availableFont);
                doc.font('MainFont');
            }

            doc.fontSize(20).text('ЗВІТ ПО МАРШРУТАХ', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(10).text(`Дата: ${new Date().toLocaleString('uk-UA')}`, { align: 'center' });
            if (startDate) doc.text(`Від: ${startDate}`, { align: 'center' });
            if (endDate) doc.text(`До: ${endDate}`, { align: 'center' });
            if (status) doc.text(`Статус: ${status}`, { align: 'center' });
            doc.text(`Всього маршрутів у звіті: ${routes.length}`, { align: 'center' });
            doc.moveDown();

            if (routes.length === 0) {
                doc.text('Немає даних для відображення', { align: 'center' });
                doc.end();
                return;
            }

            let y = doc.y;
            const startX = 50;
            
            doc.fontSize(9);
            doc.text('№', startX, y);
            doc.text('ТЗ', startX + 30, y);
            doc.text('Звідки', startX + 80, y);
            doc.text('Куди', startX + 200, y);
            doc.text('Дата', startX + 320, y);
            doc.text('Статус', startX + 400, y);
            
            y += 20;
            doc.moveTo(startX, y).lineTo(startX + 550, y).stroke();
            y += 10;

            routes.forEach((route, i) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    doc.fontSize(9);
                }
                
                doc.text((i + 1).toString(), startX, y);
                doc.text((route.plate_number || '—').substring(0, 8), startX + 30, y);
                doc.text((route.start_point || '—').substring(0, 25), startX + 80, y);
                doc.text((route.end_point || '—').substring(0, 25), startX + 200, y);
                
                const date = route.planned_start ? new Date(route.planned_start).toLocaleDateString('uk-UA') : '—';
                doc.text(date, startX + 320, y);
                
                let statusText = route.status === 'planned' ? 'Заплан.' :
                                route.status === 'active' ? 'Активн.' :
                                route.status === 'completed' ? 'Заверш.' : 'Скас.';
                doc.text(statusText, startX + 400, y);
                
                y += 20;
            });

            doc.end();

        } catch (error) {
            console.error('Error generating routes PDF:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Помилка генерації PDF: ' + error.message });
            }
        }
    }
};

module.exports = reportController;