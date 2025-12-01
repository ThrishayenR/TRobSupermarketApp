const CartItems = require('../models/CartItem');
const db = require('../db'); // <-- needed to fetch product price

const CartItemsController = {
    list(req, res) {
        const userId = (req.session.user && (req.session.user.userId || req.session.user.id));
        if (!userId) return res.status(401).send('Not authenticated');

        CartItems.getByUserId(userId, (err, cartItems) => {
            if (err) {
                console.error('Cart list error:', err);
                return res.status(500).send('Error retrieving cart');
            }

            const normalized = (cartItems || []).map(item => ({
                id: item.id,
                userId: item.user_id || item.userId,
                product_id: item.product_id,
                fineId: item.product_id || item.fine_id || item.fineId,
                productName: item.productName || item.name || item.product_name || '',
                name: item.productName || item.name || item.product_name || '',
                price: (item.price != null) ? Number(item.price) : 0,
                quantity: (item.quantity != null) ? Number(item.quantity) : 0,
                image: item.image || null
            }));

            res.render('cart', { cartItems: normalized, user: req.session.user });
        });
    },

    // 🔥 FIXED VERSION — ONLY this function changed
    add(req, res) {
    const userId = (req.session.user && (req.session.user.userId || req.session.user.id));
    if (!userId) {
        req.flash('error', 'Please log in to add items to cart');
        return res.redirect('/login');
    }

    const idFromBody = req.body.fineId || req.body.productId || req.body.fine_id || req.body.product_id;
    const productId = parseInt(idFromBody || req.params.id, 10);
    if (isNaN(productId)) {
        req.flash('error', 'Invalid product id');
        return res.redirect('/shopping');
    }

    const qtyToAdd = parseInt(req.body.quantity, 10) || 1;

    // STEP 1 ─ Get product stock + price
    const productSql = "SELECT price, quantity FROM products WHERE id = ?";
    db.query(productSql, [productId], (err, productRows) => {
        if (err || productRows.length === 0) {
            req.flash('error', 'Product not found');
            return res.redirect('/shopping');
        }

        const product = productRows[0];
        const stock = Number(product.quantity);
        const price = Number(product.price);

        // STEP 2 ─ Get existing quantity in cart
        const existingSql = `
            SELECT quantity FROM cart_items
            WHERE user_id = ? AND product_id = ?
        `;

        db.query(existingSql, [userId, productId], (err2, cartRows) => {
            if (err2) {
                req.flash('error', 'Database error checking cart');
                return res.redirect('/shopping');
            }

            const alreadyInCart = cartRows.length > 0 ? Number(cartRows[0].quantity) : 0;

            // STEP 3 ─ Validate stock properly
            if (alreadyInCart + qtyToAdd > stock) {
                const remaining = stock - alreadyInCart;
                req.flash(
                    'error',
                    `Only ${remaining} item(s) left in stock. You already have ${alreadyInCart} in your cart.`
                );
                return res.redirect('/shopping');
            }

            // STEP 4 ─ Add or update cart entry
            CartItems.add(userId, productId, qtyToAdd, price, (err3) => {
                if (err3) {
                    console.error('Cart add error:', err3);
                    req.flash('error', 'Could not add item to cart');
                    return res.redirect('/shopping');
                }

                req.flash('success', 'Item added to cart');
                return res.redirect('/cart');
            });
        });
    });
},


    remove(req, res) {
        const userId = (req.session.user && (req.session.user.userId || req.session.user.id));
        if (!userId) {
            req.flash('error', 'Please log in');
            return res.redirect('/login');
        }

        const idFromBody = req.body.fineId || req.body.productId || req.body.fine_id || req.body.product_id;
        const productId = parseInt(idFromBody || req.params.id, 10);
        if (isNaN(productId)) {
            req.flash('error', 'Invalid product id');
            return res.redirect('/cart');
        }

        CartItems.remove(userId, productId, (err) => {
            if (err) {
                console.error('Cart remove error:', err);
                req.flash('error', 'Could not remove item');
            } else {
                req.flash('success', 'Item removed');
            }
            res.redirect('/cart');
        });
    },

    clear(req, res) {
        const userId = (req.session.user && (req.session.user.userId || req.session.user.id));
        if (!userId) {
            req.flash('error', 'Please log in');
            return res.redirect('/login');
        }

        CartItems.clear(userId, (err) => {
            if (err) {
                console.error('Cart clear error:', err);
                req.flash('error', 'Could not clear cart');
            } else {
                req.flash('success', 'Cart cleared');
            }
            res.redirect('/cart');
        });
    }
};

module.exports = CartItemsController;