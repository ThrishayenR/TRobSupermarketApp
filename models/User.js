// ...existing code...
const db = require('../db');

const UserModel = {
    // Get all users
    getAll: function(callback) {
        const sql = 'SELECT id, username, email, address, contact, role FROM users';
        db.query(sql, (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    },

    // Get a user by ID
    getById: function(id, callback) {
        const sql = 'SELECT id, username, email, address, contact, role FROM users WHERE id = ?';
        db.query(sql, [id], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0] || null);
        });
    },

    // Add a new user
    // userData: { username, email, password, address, contact, role }
    create: function(userData, callback) {
        const sql = `INSERT INTO users (username, email, password, address, contact, role)
                     VALUES (?, ?, SHA1(?), ?, ?, ?)`;
        const params = [
            userData.username,
            userData.email,
            userData.password,
            userData.address || null,
            userData.contact || null,
            userData.role || 'user'
        ];
        db.query(sql, params, (err, result) => {
            if (err) return callback(err);
            // return the newly created id and the provided data (without password)
            const created = {
                id: result.insertId,
                username: userData.username,
                email: userData.email,
                address: userData.address || null,
                contact: userData.contact || null,
                role: userData.role || 'user'
            };
            callback(null, created);
        });
    },

    // Update a user by ID
    // userData: { username, email, password, address, contact, role }
    update: function(id, userData, callback) {
        const sql = `UPDATE users SET
                        username = ?,
                        email = ?,
                        password = ?,
                        address = ?,
                        contact = ?,
                        role = ?
                     WHERE id = ?`;
        const params = [
            userData.username,
            userData.email,
            userData.password,
            userData.address || null,
            userData.contact || null,
            userData.role || 'user',
            id
        ];
        db.query(sql, params, (err, result) => {
            if (err) return callback(err);
            callback(null, { affectedRows: result.affectedRows });
        });
    },

    // Delete a user by ID
    delete: function(id, callback) {
        const sql = 'DELETE FROM users WHERE id = ?';
        db.query(sql, [id], (err, result) => {
            if (err) return callback(err);
            callback(null, { affectedRows: result.affectedRows });
        });
    }
};

module.exports = UserModel;
// ...existing code...