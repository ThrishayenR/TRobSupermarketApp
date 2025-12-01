const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');

const ProductController = require('./controllers/ProductController');
const ProductModel = require('./models/Product'); // used for shopping listing when needed
const UserController = require('./controllers/UserController'); // <-- use MVC user controller
const CartItemsController = require('./controllers/CartItemController');
const OrderController = require('./controllers/OrderController');
const db = require('./db'); // central DB connection used by models/controllers and product routes

const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Session Middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact) {
        return res.status(400).send('All fields are required.');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Define routes

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// Inventory listing -> use ProductController
app.get('/inventory', checkAuthenticated, checkAdmin, ProductController.list);

// Register routes (use user controller)
app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

// Use UserController.add to handle registration (add user).
// File upload middleware kept optional (in case user creation accepts an uploaded avatar/image)
app.post('/register', validateRegistration, upload.single('image'), (req, res, next) => {
    // If a file was uploaded, attach filename to body for controller/model usage
    if (req.file) req.body.image = req.file.filename;
    return UserController.add(req, res, next);
});

// Login routes (keeps same behavior for session creation)
app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            // Successful login
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (req.session.user.role === 'user')
                res.redirect('/shopping');
            else
                res.redirect('/inventory');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

// User management routes using MVC controller (RESTful)
// List all users (admin only)
app.get('/users', checkAuthenticated, checkAdmin, UserController.list);

// Get single user by id (authenticated)
app.get('/users/:id', checkAuthenticated, UserController.getById);

// Create user (admin or via registration). Accept file upload if provided.
app.post('/users', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    if (req.file) req.body.image = req.file.filename;
    return UserController.add(req, res, next);
});

// Update user (PUT). Also support form POST for browsers that don't use PUT.
app.put('/users/:id', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    if (req.file) req.body.image = req.file.filename;
    return UserController.update(req, res, next);
});
app.post('/users/:id/update', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    if (req.file) req.body.image = req.file.filename;
    return UserController.update(req, res, next);
});

// Delete user (DELETE). Also provide POST fallback for forms.
app.delete('/users/:id', checkAuthenticated, checkAdmin, UserController.delete);
app.post('/users/:id/delete', checkAuthenticated, checkAdmin, UserController.delete);

// Shopping listing for regular users (renders shopping view)
app.get('/shopping', checkAuthenticated, (req, res) => {
    ProductModel.getAll(function (err, products) {
        if (err) return res.status(500).send(err.message || 'Database error');

        res.render('shopping', { 
            user: req.session.user, 
            products,
            messages: req.flash('error'),
            success: req.flash('success')
        });
    });
});

// Product detail -> use ProductController.getById
app.get('/product/:id', checkAuthenticated, ProductController.getById);

// Add product views/routes
app.get('/addProduct', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addProduct', { user: req.session.user });
});

// Add product (file upload handled, then hand off to controller)
app.post('/addProduct', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    if (req.file) {
        req.body.image = req.file.filename;
    } else {
        req.body.image = null;
    }
    // Controller will handle inserting and redirecting/rendering
    return ProductController.add(req, res, next);
});

// Update product view -> fetch product using db for edit form
app.get('/updateProduct/:id', checkAuthenticated, checkAdmin, (req, res) => {
    const productId = req.params.id;
    const sql = 'SELECT * FROM products WHERE id = ?';
    db.query(sql, [productId], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.render('updateProduct', { product: results[0] });
        } else {
            res.status(404).send('Product not found');
        }
    });
});

// Update product (file upload handled, then hand off to controller)
app.post('/updateProduct/:id', checkAuthenticated, checkAdmin, upload.single('image'), (req, res, next) => {
    const productId = req.params.id;
    // If a new file uploaded, set image to filename; otherwise keep currentImage from form
    if (req.file) {
        req.body.image = req.file.filename;
    } else {
        req.body.image = req.body.currentImage || null;
    }
    return ProductController.update(req, res, next);
});

// Delete product -> use controller
app.get('/deleteProduct/:id', checkAuthenticated, checkAdmin, ProductController.delete);

// ----- REPLACED undefined admin route -----
// old: app.get('/admin/dashboard', checkAuthenticated, checkAuthorised(['admin']), FinesController.adminDashboard);
app.get('/admin/dashboard', checkAuthenticated, checkAdmin, (req, res) => {
    // no FinesController available — redirect admin to inventory (adjust if you want a dedicated admin view)
    res.redirect('/inventory');
});

const PORT = process.env.PORT || 3000;

// Cart routes (use your existing CartItemsController routes)
app.get('/cart', checkAuthenticated, CartItemsController.list);
app.post('/cart/add', checkAuthenticated, CartItemsController.add);
app.post('/cart/remove', checkAuthenticated, CartItemsController.remove);
app.post('/cart/clear', checkAuthenticated, CartItemsController.clear);

// Compatibility route: allow legacy forms that POST to /add-to-cart/:id
app.post('/add-to-cart/:id', checkAuthenticated, (req, res, next) => {
    // support different field names: fineId, productId or params.id
    req.body.fineId = req.body.fineId || req.body.productId || req.params.id;
    return CartItemsController.add(req, res, next);
});

// Checkout route
app.post('/checkout', checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    // 1. Get all cart items
    const getCartSql = 'SELECT * FROM cart_items WHERE user_id = ?';

    db.query(getCartSql, [userId], (err, cartItems) => {
        if (err) throw err;

        if (cartItems.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // 2. Create order
        const createOrderSql = 'INSERT INTO orders (user_id, status, orderDate) VALUES (?, "Pending", NOW())';

        db.query(createOrderSql, [userId], (err, orderResult) => {

            if (err) throw err;

            const orderId = orderResult.insertId;

            // 3. Insert all order items
            const insertOrderItemSql =
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?';

            const values = cartItems.map(item => [
                orderId,
                item.product_id,
                item.quantity,
                item.price
            ]);

            db.query(insertOrderItemSql, [values], (err) => {
                if (err) throw err;

                // 3.5. Deduct stock from products
                const updatePromises = cartItems.map(item => {
                    return new Promise((resolve, reject) => {
                        db.query(
                            "UPDATE products SET quantity = quantity - ? WHERE id = ?",
                            [item.quantity, item.product_id],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            }
                        );
                    });
                });

                Promise.all(updatePromises)
                    .then(() => {
                        // 4. Clear cart
                        const deleteCartSql = 'DELETE FROM cart_items WHERE user_id = ?';

                        db.query(deleteCartSql, [userId], (err) => {
                            if (err) throw err;

                            // 5. Redirect to invoice
                            return res.redirect(`/invoice/${orderId}`);
                        });
                    })
                    .catch(err => {
                        console.error(err);
                        req.flash("error", "Something went wrong updating stock.");
                        return res.redirect("/cart");
                    });
            });
        });
    });
});

// Invoice route

app.get('/invoice/:orderId', checkAuthenticated, (req, res) => {
    const orderId = req.params.orderId;

    const sql = `
        SELECT oi.product_id, oi.quantity, oi.price, p.productName AS productName, p.image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `;

    db.query(sql, [orderId], (err, items) => {
        if (err) throw err;

        res.render('invoice', {
            orderId,
            items,
            user: req.session.user
        });
    });
});

// User view pending orders
app.get('/pending-orders', checkAuthenticated, OrderController.viewPendingOrders);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});