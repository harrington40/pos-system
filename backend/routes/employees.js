const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const adminEngine = require('../services/admin-engine');

// GET /api/employees — List all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    // Don't send PINs back
    const safe = employees.map(e => ({
      _id: e._id,
      name: e.name,
      role: e.role,
      isActive: e.isActive,
      shift: e.shift,
      phone: e.phone,
      email: e.email,
      ordersProcessed: e.ordersProcessed,
      totalSalesAmount: e.totalSalesAmount,
      refundsProcessed: e.refundsProcessed,
      performanceScore: e.performanceScore,
      lastLogin: e.lastLogin,
      createdAt: e.createdAt
    }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees — Create new employee
router.post('/', async (req, res) => {
  try {
    const { name, pin, role, shift, phone, email } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: 'Name and PIN are required' });
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }
    const employee = new Employee({ name, pin, role, shift, phone, email });
    await employee.save();
    res.status(201).json({
      _id: employee._id,
      name: employee.name,
      role: employee.role,
      shift: employee.shift,
      message: 'Employee created successfully'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Duplicate entry' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees/login — PIN-based login
router.post('/login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    const employees = await Employee.find({ isActive: true });
    let matched = null;
    for (const emp of employees) {
      if (await emp.comparePin(pin)) {
        matched = emp;
        break;
      }
    }

    if (!matched) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Update last login
    matched.lastLogin = new Date();
    await matched.save();

    res.json({
      _id: matched._id,
      name: matched.name,
      role: matched.role,
      shift: matched.shift,
      message: 'Login successful'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id — Update employee
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name', 'role', 'shift', 'phone', 'email', 'isActive'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (req.body.pin) {
      if (!/^\d{4}$/.test(req.body.pin)) {
        return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
      }
      // We'll set pin directly; the pre-save hook will hash it
      const emp = await Employee.findById(req.params.id);
      if (!emp) return res.status(404).json({ error: 'Employee not found' });
      emp.pin = req.body.pin;
      Object.assign(emp, updates);
      await emp.save();
      return res.json({ message: 'Employee updated', _id: emp._id });
    }
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee updated', _id: employee._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employees/:id — Deactivate employee
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/performance — Employee performance scores
router.get('/performance', async (req, res) => {
  try {
    const performance = await adminEngine.getEmployeePerformance();
    res.json(performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
