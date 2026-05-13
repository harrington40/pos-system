const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');

const app = express();
app.use(express.json());

const menuRoutes = require('../../routes/menu');
app.use('/api/menu', menuRoutes);

const MenuItem = require('../../models/MenuItem');
const { connect, disconnect, clearDatabase } = require('../helpers/mongoose');

describe('Menu API Routes', () => {
  beforeAll(async () => {
    await connect();
    await clearDatabase();
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('GET /api/menu', () => {
    it('should return all menu items', async () => {
      await MenuItem.create([
        { name: 'Pizza', category: 'lunch', price: 5000, stock: 10 },
        { name: 'Soda', category: 'drinks', price: 1000, stock: 50 },
        { name: 'Salad', category: 'dinner', price: 3000, stock: 20 },
      ]);

      const res = await request(app).get('/api/menu');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
    });

    it('should return empty array when no items exist', async () => {
      const res = await request(app).get('/api/menu');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/menu/categories', () => {
    it('should return unique categories with counts', async () => {
      await MenuItem.create([
        { name: 'Pizza', category: 'lunch', price: 5000, stock: 10 },
        { name: 'Pasta', category: 'lunch', price: 4500, stock: 15 },
        { name: 'Soda', category: 'drinks', price: 1000, stock: 50 },
      ]);

      const res = await request(app).get('/api/menu/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const lunch = res.body.find(c => c._id === 'lunch');
      expect(lunch).toBeDefined();
      expect(lunch.count).toBe(2);

      const drinks = res.body.find(c => c._id === 'drinks');
      expect(drinks).toBeDefined();
      expect(drinks.count).toBe(1);
    });
  });
});
