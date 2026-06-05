const bcrypt = require('bcryptjs');
const { getDB } = require('../config/database');

class User {

    static async create(email, password, name) {
        const db = getDB();

        try {
            email = email.trim().toLowerCase();
            name = name.trim();

            const [existing] = await db.execute(
                'SELECT Id FROM users WHERE Email = ?',
                [email]
            );

            if (existing.length > 0) {
                throw new Error('Користувач з таким email вже існує');
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await db.execute(
                'INSERT INTO users (Email, Password, Name) VALUES (?, ?, ?)',
                [email, hashedPassword, name]
            );

            return {
                Id: result.insertId,
                Email: email,
                Name: name
            };
        } catch (error) {
            console.error('User.create error:', error.message);
            throw error;
        }
    }

    static async findByEmail(email) {
        const db = getDB();

        try {
            const [rows] = await db.execute(
                'SELECT * FROM users WHERE Email = ?',
                [email.trim().toLowerCase()]
            );

            return rows[0] || null;
        } catch (error) {
            console.error('User.findByEmail error:', error.message);
            throw error;
        }
    }

    static async findById(id) {
        const db = getDB();

        try {
            const [rows] = await db.execute(
                'SELECT Id, Email, Name, CreatedAt FROM users WHERE Id = ?',
                [id]
            );

            return rows[0] || null;
        } catch (error) {
            console.error('User.findById error:', error.message);
            throw error;
        }
    }
}

module.exports = User;
