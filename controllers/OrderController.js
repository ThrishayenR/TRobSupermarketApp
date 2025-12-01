const db = require('../db');

const OrderController = {

    // ================================
    // 1. USER: View Completed Orders
    // ================================
    viewOrders: (req, res) => {
        const userId = req.session.user.id;

        const sql = `
            SELECT 
                orders.id AS order_id,
                orders.orderDate,
                order_items.product_id,
                order_items.quantity,
                order_items.price,
                products.productName,
                products.image
            FROM orders
            JOIN order_items ON orders.id = order_items.order_id
            JOIN products ON order_items.product_id = products.id
            WHERE orders.user_id = ? AND orders.status = 'Completed'
            ORDER BY orders.id DESC;
        `;

        db.query(sql, [userId], (err, results) => {
            if (err) return res.status(500).send('DB Error');

            const orders = {};

            results.forEach(row => {
                if (!orders[row.order_id]) {
                    orders[row.order_id] = {
                        id: row.order_id,
                        orderDate: row.orderDate,
                        items: []
                    };
                }

                orders[row.order_id].items.push({
                    productName: row.productName,
                    quantity: row.quantity,
                    price: row.price,
                    image: row.image
                });
            });

            res.render('orders', { orders: Object.values(orders) });
        });
    },


    // ================================
    // 2. USER: View Pending Orders
    // ================================
    viewPendingOrders: (req, res) => {
        const userId = req.session.user.id;

        const sql = `
            SELECT 
                orders.id AS order_id,
                orders.orderDate,
                order_items.product_id,
                order_items.quantity,
                order_items.price,
                products.productName,
                products.image
            FROM orders
            JOIN order_items ON orders.id = order_items.order_id
            JOIN products ON order_items.product_id = products.id
            WHERE orders.user_id = ? AND orders.status = 'Pending'
            ORDER BY orders.id DESC;
        `;

        db.query(sql, [userId], (err, results) => {
            if (err) return res.status(500).send('DB Error');

            const orders = {};

            results.forEach(row => {
                if (!orders[row.order_id]) {
                    orders[row.order_id] = {
                        id: row.order_id,
                        orderDate: row.orderDate,
                        items: []
                    };
                }

                orders[row.order_id].items.push({
                    productName: row.productName,
                    quantity: row.quantity,
                    price: row.price,
                    image: row.image
                });
            });

            res.render('pendingOrders', { orders: Object.values(orders) });
        });
    },


    // ================================
    // 3. ADMIN: View All Pending Orders
    // ================================
    viewManageOrders: (req, res) => {

        // Only admins allowed
        if (req.session.user.role !== 'admin') {
            return res.redirect('/');
        }

        const sql = `
            SELECT 
                orders.id AS order_id,
                orders.user_id,
                orders.orderDate,
                users.username
            FROM orders
            JOIN users ON orders.user_id = users.id
            WHERE orders.status = 'Pending'
            ORDER BY orders.id ASC;
        `;

        db.query(sql, (err, results) => {
            if (err) throw err;

            res.render('manageOrders', { orders: results });
        });
    },


    // ================================
    // 4. ADMIN: Mark an Order as Completed
    // ================================
    markOrderComplete: (req, res) => {

        // Again, protect route
        if (req.session.user.role !== 'admin') {
            return res.redirect('/');
        }

        const orderId = req.body.orderId;

        const sql = `UPDATE orders SET status = 'Completed' WHERE id = ?`;

        db.query(sql, [orderId], (err) => {
            if (err) throw err;

            res.redirect('/manage-orders');
        });
    }

};

module.exports = OrderController;