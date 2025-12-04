const User = require('../models/User');
const db = require('../db');
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

const UserController = {

    // ================================
    // CRUD SECTION
    // ================================
    list: function(req, res) {
        User.getAll((err, users) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch users', details: err.message });
            res.json(users);
        });
    },

    getById: function(req, res) {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

        User.getById(id, (err, user) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch user', details: err.message });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        });
    },

    add: function(req, res) {
        const { username, email, password, address, contact, role, enable2fa } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email and password are required' });
        }

        const userData = { username, email, password, address, contact, role };

        User.create(userData, (err, created) => {
            if (err) return res.status(500).json({ error: 'Failed to create user', details: err.message });

            // 🔥 FIXED: use created.id (not created.insertId)
            if (enable2fa === 'yes') {
                req.session.user = { id: created.id }; 
                return res.redirect('/setup-2fa');
            }

            return res.redirect('/login');
        });
    },

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

    delete: function(req, res) {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });

        User.delete(id, (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to delete user', details: err.message });
            if (!result || result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
            res.json({ message: 'User deleted', affectedRows: result.affectedRows });
        });
    },

    // ================================
    // 2FA SETUP
    // ================================
    setup2FA: async (req, res) => {

        const secret = speakeasy.generateSecret({
            name: "OneStopMart"
        });

        req.session.temp_secret = secret;

        const qrData = await qrcode.toDataURL(secret.otpauth_url);

        res.render("setup-2fa", { 
            qrData, 
            error: null 
        });
    },

    verify2FASetup: (req, res) => {
        const { token } = req.body;
        const secret = req.session.temp_secret;

        const verified = speakeasy.totp.verify({
            secret: secret.base32,
            encoding: "base32",
            token
        });

        if (!verified) {
            qrcode.toDataURL(secret.otpauth_url, (err, qrData) => {
                return res.render("setup-2fa", { 
                    qrData,
                    error: "Invalid code"
                });
            });
            return;
        }

        // Save secret to DB
        const sql = "UPDATE users SET totp_secret = ? WHERE id = ?";
        db.query(sql, [secret.base32, req.session.user.id], (err) => {
            if (err) throw err;

            req.session.temp_secret = null;

            req.flash("success", "2FA enabled. Please log in.");
            return res.redirect("/login");
        });
    },

    // ================================
    // 2FA LOGIN FLOW
    // ================================
    verify2FAPage: (req, res) => {
        if (!req.session.tempUserId) return res.redirect('/login');
        res.render('verify-2fa', { error: null });
    },

    verify2FA: (req, res) => {
        const { token } = req.body;
        const userId = req.session.tempUserId;

        if (!userId) return res.redirect('/login');

        const sql = 'SELECT * FROM users WHERE id = ?';

        db.query(sql, [userId], (err, results) => {
            if (err) throw err;

            const user = results[0];

            const verified = speakeasy.totp.verify({
                secret: user.totp_secret,
                encoding: 'base32',
                token,
                window: 1
            });

            if (!verified) {
                req.flash('error', 'Invalid 2FA code.');
                return res.redirect('/verify-2fa');
            }

            req.session.user = user;
            req.session.tempUserId = null;

            req.flash('success', 'Login successful!');
            return user.role === 'user'
                ? res.redirect('/')
                : res.redirect('/inventory');
        });
    }

};

module.exports = UserController;