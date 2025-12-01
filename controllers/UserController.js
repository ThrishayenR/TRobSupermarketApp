// require path corrected to match models/User.js
const User = require('../models/User');

const UserController = {
    // List all users
    list: function(req, res) {
        User.getAll((err, users) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
            res.json(users);
        });
    },

    // Get a single user by ID
    getById: function(req, res) {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

        User.getById(id, (err, user) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch user', details: err.message });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        });
    },

    // Add a new user
    add: function(req, res) {
        const { username, email, password, address, contact, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email and password are required' });
        }

        const userData = { username, email, password, address, contact, role };
        User.create(userData, (err, created) => {
            if (err) return res.status(500).json({ error: 'Failed to create user', details: err.message });
            return res.redirect('/login');
        });
    },

    // Update an existing user
    update: function(req, res) {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

        const { username, email, password, address, contact, role } = req.body;
        const userData = { username, email, password, address, contact, role };

        User.update(id, userData, (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to update user', details: err.message });
            if (!result || result.affectedRows === 0) return res.status(404).json({ error: 'User not found or no change made' });
            res.json({ message: 'User updated', affectedRows: result.affectedRows });
        });
    },

    // Delete a user
    delete: function(req, res) {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

        User.delete(id, (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to delete user', details: err.message });
            if (!result || result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
            res.json({ message: 'User deleted', affectedRows: result.affectedRows });
        });
    }
};

module.exports = UserController;