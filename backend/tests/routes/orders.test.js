const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');

const app = express();
app.use(express.json());

const orderRoutes = require('../../routes/orders');
app.use('/api/orders', orderRoutes);

const Order = require('../../models/Order');
const MenuItem = require('../../models/MenuItem');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('Orders API Routes', () => {
  let menuItemId;

  beforeAll(async () => {
    await connect();
    await clearDatabase();

    // Create a menu item so the order route can validate it
    const menuItem = await MenuItem.create({
      name: 'Pizza',
      category: 'lunch',
      price: 5000,
      stock: 100,
    });
    menuItemId = menuItem._id;
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Re-create menu item after clear
    const menuItem = await MenuItem.create({
      name: 'Pizza',
      category: 'lunch',
      price: 5000,
      stock: 100,
    });
    menuItemId = menuItem._id;
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [
            {
              menuItem: menuItemId.toString(),
              name: 'Pizza',
              price: 5000,
              quantity: 2,
            },
          ],
          subtotal: 10000,
          tax: 500,
          total: 10500,
          paymentMethod: 'cash',
        });

      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
      expect(res.body.order).toBeDefined();
      expect(res.body.order.receiptNumber).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      await Order.create([
        {
          items: [{ menuItem: menuItemId, name: 'Pizza', price: 5000, quantity: 1 }],
          subtotal: 5000,
          tax: 250,
          total: 5250,
          paymentMethod: 'cash',
          receiptNumber: 'RCP-LIST-001',
        },
        {
          items: [{ menuItem: menuItemId, name: 'Soda', price: 1000, quantity: 2 }],
          subtotal: 2000,
          tax: 100,
          total: 2100,
          paymentMethod: 'mobile_money',
          receiptNumber: 'RCP-LIST-002',
        },
      ]);

      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBe(2);
    });

    it('should return empty orders list when no orders exist', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.orders).toEqual([]);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return an order by ID', async () => {
      const order = await Order.create({
        items: [{ menuItem: menuItemId, name: 'Pizza', price: 5000, quantity: 1 }],
        subtotal: 5000,
        tax: 250,
        total: 5250,
        paymentMethod: 'cash',
        receiptNumber: 'RCP-GET-001',
      });

      const res = await request(app).get(`/api/orders/${order._id}`);
      expect(res.status).toBe(200);
      // GET /:id returns the order document directly
      expect(res.body.receiptNumber).toBe('RCP-GET-001');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get(`/api/orders/${new mongoose.Types.ObjectId()}`);
      expect(res.status).toBe(404);
    });
  });
});
