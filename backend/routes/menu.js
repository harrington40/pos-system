const express = require('express');
const router = express.Router();
const axios = require('axios');
const MenuItem = require('../models/MenuItem');
const b2Service = require('../services/b2-service');

// GET /api/menu - Get all items, optionally filtered by category
router.get('/', async (req, res) => {
  try {
    const { category, sort } = req.query;
    const filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }

    let sortOption = { name: 1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    else if (sort === 'popular') sortOption = { popular: -1, rating: -1 };

    const items = await MenuItem.find(filter).sort(sortOption);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/menu/categories - Get all available categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await MenuItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/menu/popular - Get popular items
router.get('/popular', async (req, res) => {
  try {
    const items = await MenuItem.find({ popular: true }).sort({ rating: -1 }).limit(8);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/menu/:id/image - Update item image (base64, URL, or B2 reference)
// Backward-compatible: accepts base64 data URLs (legacy) or B2 URLs
router.put('/:id/image', async (req, res) => {
  try {
    const { image, imagePublicId } = req.body;
    if (!image && image !== '') {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const updateFields = { image };
    if (imagePublicId !== undefined) {
      updateFields.imagePublicId = imagePublicId;
    }

    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: 'after' }
    );

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/menu/image — Proxy for private B2 images ──
// Serves images from the private B2 bucket using signed URLs.
// The frontend references images as: /api/menu/image/{fileName}
// This endpoint generates a temporary signed URL and streams the image.
// Cache: 1 hour (signed URL TTL), ETag for conditional requests.
router.get('/image', async (req, res) => {
  try {
    const fileName = req.query.file;
    if (!fileName) {
      return res.status(400).json({ error: 'Missing fileName parameter' });
    }

    // Generate a signed URL valid for 1 hour
    const signedUrl = await b2Service.getSignedUrl(fileName, 3600);

    // Stream the image from B2 through our backend
    const response = await axios({
      method: 'GET',
      url: signedUrl,
      responseType: 'stream',
      timeout: 10000,
    });

    // Forward content headers
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    // Cache for 1 hour (matching signed URL TTL)
    res.setHeader('Cache-Control', 'public, max-age=3600');

    response.data.pipe(res);
  } catch (err) {
    console.error('[Menu] Image proxy error:', err.message);
    res.status(500).json({ error: 'Failed to serve image', details: err.message });
  }
});

module.exports = router;
