// ...existing code...
const db = require('../db');
const Product = require('../models/Product');

const ProductController = {
  // List all products (for inventory view)
  list: function(req, res, next) {
    Product.getAll(function(err, products) {
      if (err) {
        if (next) return next(err);
        return res.status(500).send(err.message || 'Database error');
      }
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json(products);
      }
      res.render('inventory', { products, user: req.session?.user });
    });
  },

  // Get single product by ID
  getById: function(req, res, next) {
    const id = req.params.id;
    Product.getById(id, function(err, product) {
      if (err) {
        if (next) return next(err);
        return res.status(500).send(err.message || 'Database error');
      }
      if (!product) return res.status(404).send('Product not found');
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json(product);
      }
      // pass user to the view so templates like product.ejs can access req.session.user
      res.render('product', { product, user: req.session?.user });
    });
  },

  // Add new product
  add: function(req, res, next) {
    // accept either productName or name from forms
    const productName = req.body.productName || req.body.name;
    const quantity = req.body.quantity != null && req.body.quantity !== '' ? parseInt(req.body.quantity, 10) : 0;
    const price = req.body.price != null && req.body.price !== '' ? parseFloat(req.body.price) : 0;
    const image = req.body.image || req.body.currentImage || null;

    const product = {
      productName,
      quantity,
      price,
      image
    };

    Product.add(product, function(err, inserted) {
      if (err) {
        if (next) return next(err);
        return res.status(500).send(err.message || 'Database error');
      }
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(201).json(inserted);
      }
      // redirect to inventory after successful add
      res.redirect('/inventory');
    });
  },

  // Update product (merge incoming form fields with existing product to avoid NULLs)
  update: function (req, res, next) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      req.flash('error', 'Invalid product id');
      return res.redirect('/inventory');
    }

    // Map possible form field names
    const incoming = {
      productName: req.body.productName || req.body.name,
      quantity: req.body.quantity,
      price: req.body.price,
      image: req.body.image || req.body.currentImage || null
    };

    // Fetch existing product, merge, then update via model
    Product.getById(id, (err, existing) => {
      if (err) {
        req.flash('error', 'Database error');
        return res.redirect('/updateProduct/' + id);
      }
      if (!existing) {
        req.flash('error', 'Product not found');
        return res.redirect('/inventory');
      }

      const merged = {
        productName: (incoming.productName != null && incoming.productName !== '') ? incoming.productName : existing.productName,
        quantity: (incoming.quantity != null && incoming.quantity !== '') ? parseInt(incoming.quantity, 10) : existing.quantity,
        price: (incoming.price != null && incoming.price !== '') ? parseFloat(incoming.price) : existing.price,
        image: incoming.image || existing.image
      };

      Product.update(id, merged, (err, result) => {
        if (err) {
          req.flash('error', 'Failed to update product: ' + (err.message || err));
          return res.redirect('/updateProduct/' + id);
        }
        req.flash('success', 'Product updated');
        return res.redirect('/inventory');
      });
    });
  },

  // Delete product
  delete: function(req, res, next) {
    const id = req.params.id;
    Product.delete(id, function(err, result) {
      if (err) {
        if (next) return next(err);
        return res.status(500).send(err.message || 'Database error');
      }
      if (result.affectedRows === 0) return res.status(404).send('Product not found');
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true });
      }
      // redirect to inventory after delete
      res.redirect('/inventory');
    });
  }
};

module.exports = ProductController;
// ...existing code...