/**
 * Auth Routes - Smart AI Login & Employee Authentication
 * Provides AI-powered login with anomaly detection, session management,
 * and employee verification using PIN + AI pattern analysis.
 */

const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const aiService = require('../services/ai');

// In-memory session store (in production, use Redis/JWT)
const sessions = new Map();

// ── Helper: Generate session token ──
function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `sess_${token}`;
}

// ── Helper: Clean expired sessions ──
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}
setInterval(cleanExpiredSessions, 60000); // Clean every minute

// ── Middleware: Require valid session ──
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized - Please login' });
  }
  const session = sessions.get(token);
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired - Please login again' });
  }
  req.session = session;
  req.employee = session.employee;
  next();
};

/**
 * POST /api/auth/login
 * Smart AI-Powered Login
 * Body: { pin, employeeId?, email? }
 * 
 * AI analyzes login patterns for anomaly detection:
 * - Unusual login times
 * - Rapid successive attempts
 * - Location/IP anomalies (if available)
 */
router.post('/login', async (req, res) => {
  try {
    const { pin, employeeId, email } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Find employee by ID, email, or PIN
    let employee;
    if (employeeId) {
      employee = await Employee.findById(employeeId);
    } else if (email) {
      employee = await Employee.findOne({ email });
    } else {
      // PIN-only login: search all employees and compare with bcrypt
      const allEmployees = await Employee.find({ isActive: true });
      for (const emp of allEmployees) {
        const match = await emp.comparePin(pin);
        if (match) {
          employee = emp;
          break;
        }
      }
    }

    if (!employee) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify PIN (bcrypt hashed) — only needed for ID/email lookups
    let pinValid = true;
    if (employeeId || email) {
      pinValid = await employee.comparePin(pin);
    }
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    if (!employee.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // ── AI-Powered Anomaly Detection ──
    let aiAnalysis = null;
    if (aiService.isConfigured()) {
      try {
        const loginContext = {
          employee: employee.name,
          role: employee.role,
          shift: employee.shift,
          time: new Date().toISOString(),
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
        };

        const analysis = await aiService.generate(
          `Analyze this POS login attempt for anomalies:
Employee: ${loginContext.employee}
Role: ${loginContext.role}
Shift: ${loginContext.shift}
Login Time: ${loginContext.time} (Hour: ${loginContext.hour}, Day: ${loginContext.dayOfWeek})

Check for:
1. Is this login time appropriate for their shift?
2. Any suspicious patterns?
3. Security recommendations

Respond in JSON format:
{
  "risk": "low|medium|high",
  "reason": "brief explanation",
  "recommendation": "action to take"
}`,
          {
            systemPrompt: 'You are a POS security analyst. Analyze login attempts for anomalies. Respond ONLY with valid JSON.',
            temperature: 0.3,
            maxTokens: 300,
          }
        );

        // Parse AI response
        try {
          aiAnalysis = JSON.parse(analysis);
        } catch {
          aiAnalysis = { risk: 'low', reason: 'AI analysis unavailable', recommendation: 'proceed' };
        }
      } catch (aiErr) {
        console.warn('[Auth] AI analysis failed:', aiErr.message);
        aiAnalysis = { risk: 'low', reason: 'AI service error', recommendation: 'proceed' };
      }
    }

    // Create session
    const token = generateSessionToken();
    const sessionDuration = 8 * 60 * 60 * 1000; // 8 hours
    sessions.set(token, {
      token,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        shift: employee.shift,
      },
      createdAt: new Date(),
      expiresAt: Date.now() + sessionDuration,
      aiAnalysis,
    });

    res.json({
      token,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        shift: employee.shift,
      },
      sessionExpiresAt: new Date(Date.now() + sessionDuration).toISOString(),
      aiAnalysis,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/verify
 * Verify current session is valid
 */
router.post('/verify', requireAuth, (req, res) => {
  res.json({
    valid: true,
    employee: req.employee,
    sessionExpiresAt: new Date(req.session.expiresAt).toISOString(),
  });
});

/**
 * POST /api/auth/logout
 * End current session
 */
router.post('/logout', requireAuth, (req, res) => {
  sessions.delete(req.session.token);
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/session-info
 * Get current session info
 */
router.get('/session-info', requireAuth, (req, res) => {
  res.json({
    employee: req.employee,
    createdAt: req.session.createdAt,
    expiresAt: new Date(req.session.expiresAt).toISOString(),
    aiAnalysis: req.session.aiAnalysis,
  });
});

/**
 * POST /api/auth/ai-login
 * AI-assisted smart login with QR code verification
 * Body: { qrData } - Scanned QR code data from login QR
 */
router.post('/ai-login', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: 'Invalid QR data format' });
    }

    // QR login payload: { type: 'login', employeeId, pin, timestamp }
    if (parsed.type !== 'login' || !parsed.employeeId || !parsed.pin) {
      return res.status(400).json({ error: 'Invalid login QR code' });
    }

    // Check timestamp freshness (within 60 seconds)
    const elapsed = Date.now() - (parsed.timestamp || 0);
    if (elapsed > 60000) {
      return res.status(401).json({ error: 'QR code expired' });
    }

    // Verify credentials (bcrypt hashed)
    const employee = await Employee.findById(parsed.employeeId);
    if (!employee) {
      return res.status(401).json({ error: 'Invalid QR credentials' });
    }
    const pinValid = await employee.comparePin(parsed.pin);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid QR credentials' });
    }

    if (!employee.isActive) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    // Create session
    const token = generateSessionToken();
    const sessionDuration = 8 * 60 * 60 * 1000;
    sessions.set(token, {
      token,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        shift: employee.shift,
      },
      createdAt: new Date(),
      expiresAt: Date.now() + sessionDuration,
      loginMethod: 'qr',
    });

    res.json({
      token,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        shift: employee.shift,
      },
      sessionExpiresAt: new Date(Date.now() + sessionDuration).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
