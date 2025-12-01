// ...existing code...
const db = require('../db');

const ProductModel = {
  getAll: function(callback) {
    const sql = 'SELECT id, productName, quantity, price, image FROM products ORDER BY id DESC';
    db.query(sql, function(err, results) {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  getById: function(id, callback) {
    const sql = 'SELECT id, productName, quantity, price, image FROM products WHERE id = ?';
    db.query(sql, [id], function(err, results) {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  add: function(product, callback) {
    const sql = 'INSERT INTO products (productName, quantity, price, image) VALUES (?, ?, ?, ?)';
    const params = [product.productName, product.quantity, product.price, product.image];
    db.query(sql, params, function(err, result) {
      if (err) return callback(err);
      // return inserted id and the product data
      callback(null, { id: result.insertId, ...product });
    });
  },

  update: function(id, product, callback) {
    const sql = 'UPDATE products SET productName = ?, quantity = ?, price = ?, image = ? WHERE id = ?';
    const params = [product.productName, product.quantity, product.price, product.image, id];
    db.query(sql, params, function(err, result) {
      if (err) return callback(err);
      callback(null, { affectedRows: result.affectedRows });
    });
  },

  delete: function(id, callback) {
    const sql = 'DELETE FROM products WHERE id = ?';
    db.query(sql, [id], function(err, result) {
      if (err) return callback(err);
      callback(null, { affectedRows: result.affectedRows });
    });
  }
};

module.exports = ProductModel;
// ...existing code...