// utils/csvExporter.js
const { Parser } = require('json2csv');
const moment = require('moment');

class CSVExporter {
    async exportToCSV(data, res) {
        try {
            const fields = [
                { label: 'ID', value: 'route_id' },
                { label: 'Дата', value: row => moment(row.planned_start).format('DD.MM.YYYY') },
                { label: 'Держ. номер', value: 'plate_number' },
                { label: 'Модель', value: 'model' },
                { label: 'Тип', value: 'type' },
                { label: 'Водій', value: 'driver_name' },
                { label: 'Маршрут з', value: 'start_point' },
                { label: 'Маршрут до', value: 'end_point' },
                { label: 'План. початок', value: row => moment(row.planned_start).format('HH:mm') },
                { label: 'План. заверш.', value: row => moment(row.planned_end).format('HH:mm') },
                { label: 'Факт. початок', value: row => row.actual_start ? moment(row.actual_start).format('HH:mm') : '' },
                { label: 'Факт. заверш.', value: row => row.actual_end ? moment(row.actual_end).format('HH:mm') : '' },
                { label: 'Статус', value: 'status' }
            ];
            
            const json2csvParser = new Parser({ fields, withBOM: true });
            const csv = json2csvParser.parse(data);
            
            // Налаштування заголовків для завантаження файлу
            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.attachment(`trips_history_${moment().format('YYYYMMDD_HHmmss')}.csv`);
            res.send(csv);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CSVExporter();