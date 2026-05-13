/**
 * Upload Routes — Backblaze B2 File Upload
 * 
 * Handles multipart file upload for menu images, avatars, and documents.
 * Files are uploaded to Backblaze B2 and the public URL is stored in MongoDB.
 * 
 * Endpoints:
 *   POST   /api/upload/menu/:id/image    — Upload menu item image
 *   POST   /api/upload/menu/:id/avatar   — Upload menu item avatar/thumbnail
 *   DELETE /api/upload/menu/:id/image    — Delete menu item image from B2
 *   POST   /api/upload/document          — Upload general document
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const b2Service = require('../services/b2-service');
const imageProcessor = require('../services/image-processor');
const MenuItem = require('../models/MenuItem');

// ── Multer Configuration ──

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB (raw input — image processor will compress)

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ── Middleware: Ensure B2 is initialized ──
const ensureB2Ready = async (req, res, next) => {
  if (!b2Service.isReady()) {
    try {
      await b2Service.initialize();
    } catch (err) {
      return res.status(503).json({ error: 'B2 service unavailable', details: err.message });
    }
  }
  if (!b2Service.isReady()) {
    return res.status(503).json({ error: 'B2 service not configured. Set B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY in .env' });
  }
  next();
};

// ── POST /api/upload/menu/:id/image — Upload menu item image ──
router.post('/menu/:id/image', ensureB2Ready, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Upload] Received image upload request for item ID: ${id}`);

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send a multipart/form-data with field name "file".' });
    }

    console.log(`[Upload] File received: ${req.file.originalname} (${(req.file.buffer.length / 1024).toFixed(1)}KB)`);

    // Find the menu item
    const item = await MenuItem.findById(id);
    if (!item) {
      console.warn(`[Upload] Item not found for ID: ${id}`);
      return res.status(404).json({ error: 'Menu item not found' });
    }

    console.log(`[Upload] Found item: "${item.name}" (${item._id}) — current image: ${item.image || 'none'}`);

    // ── Smart Image Processing ──
    // Check if the image needs processing (skip if already small)
    let processingInfo = null;
    if (imageProcessor.needsProcessing(req.file.buffer)) {
      try {
        const processed = await imageProcessor.processMenuImage(
          req.file.buffer,
          req.file.mimetype
        );
        processingInfo = {
          originalSize: processed.originalSize,
          compressedSize: processed.size,
          compressionRatio: processed.compressionRatio,
          originalWidth: null, // We could add metadata here
          finalWidth: processed.width,
          finalHeight: processed.height,
          quality: processed.quality,
        };
        // Replace the buffer with the processed version
        req.file.buffer = processed.buffer;
        req.file.mimeType = processed.mimeType;
        req.file.size = processed.size;
        // Update originalname extension to .jpg since we converted to JPEG
        req.file.originalname = req.file.originalname.replace(/\.[^.]+$/, '.jpg');
      } catch (processErr) {
        // Non-blocking: if processing fails, upload original
        console.warn('[Upload] Image processing failed, uploading original:', processErr.message);
      }
    } else {
      console.log(`[Upload] Image already optimized (${(req.file.buffer.length / 1024).toFixed(1)}KB), skipping processing`);
    }

    // If the item already has a B2 image, delete the old one first
    if (item.imagePublicId && item.image) {
      try {
        await b2Service.deleteFile(item.imagePublicId, item.imagePublicId);
      } catch (deleteErr) {
        // Non-blocking: log but continue with new upload
        console.warn('[Upload] Failed to delete old image:', deleteErr.message);
      }
    }

    // Generate unique file name (use .jpg since we convert to JPEG)
    const fileName = b2Service.generateFileName(id, req.file.originalname);

    // Upload processed buffer to B2
    const result = await b2Service.uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype || 'image/jpeg'
    );

    // Store the proxy URL so the frontend loads images through our backend
    // (which generates signed URLs for the private B2 bucket)
    // Include a cache-busting timestamp so the browser never serves a stale image
    const cacheBuster = Date.now();
    const proxyUrl = `/api/menu/image?file=${encodeURIComponent(fileName)}&t=${cacheBuster}`;
    item.image = proxyUrl;
    item.imagePublicId = result.fileName;
    await item.save();

    console.log(`[Upload] Successfully updated "${item.name}" image to: ${proxyUrl}`);

    res.json({
      url: proxyUrl,
      b2Url: result.url,
      fileId: result.fileId,
      fileName: result.fileName,
      item,
      processing: processingInfo, // Include processing stats for debugging
    });
  } catch (err) {
    console.error('[Upload] Image upload error:', err.message);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// ── POST /api/upload/menu/:id/avatar — Upload menu item avatar/thumbnail ──
router.post('/menu/:id/avatar', ensureB2Ready, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Process as avatar (square crop, 200x200)
    if (imageProcessor.needsProcessing(req.file.buffer)) {
      try {
        const processed = await imageProcessor.processAvatar(
          req.file.buffer,
          req.file.mimetype
        );
        req.file.buffer = processed.buffer;
        req.file.mimeType = processed.mimeType;
        req.file.size = processed.size;
        req.file.originalname = req.file.originalname.replace(/\.[^.]+$/, '.jpg');
      } catch (processErr) {
        console.warn('[Upload] Avatar processing failed, uploading original:', processErr.message);
      }
    }

    const fileName = b2Service.generateAvatarFileName(id, req.file.originalname);
    const result = await b2Service.uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype || 'image/jpeg'
    );

    // Store proxy URL for private bucket access
    const proxyUrl = `/api/menu/image?file=${encodeURIComponent(fileName)}`;
    item.image = proxyUrl;
    item.imagePublicId = result.fileName;
    await item.save();

    res.json({
      url: proxyUrl,
      b2Url: result.url,
      fileId: result.fileId,
      fileName: result.fileName,
      item,
    });
  } catch (err) {
    console.error('[Upload] Avatar upload error:', err.message);
    res.status(500).json({ error: 'Avatar upload failed', details: err.message });
  }
});

// ── DELETE /api/upload/menu/:id/image — Delete menu item image from B2 ──
router.delete('/menu/:id/image', ensureB2Ready, async (req, res) => {
  try {
    const { id } = req.params;

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (!item.imagePublicId) {
      return res.status(400).json({ error: 'No B2 image to delete for this item' });
    }

    // Delete from B2
    await b2Service.deleteFile(item.imagePublicId, item.imagePublicId);

    // Clear the image fields in MongoDB
    item.image = '';
    item.imagePublicId = '';
    await item.save();

    res.json({ message: 'Image deleted successfully', item });
  } catch (err) {
    console.error('[Upload] Image delete error:', err.message);
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// ── GET /api/upload/signed-url — Generate a signed URL for a private bucket file ──
router.get('/signed-url', ensureB2Ready, async (req, res) => {
  try {
    const { fileName, ttl } = req.query;
    if (!fileName) {
      return res.status(400).json({ error: 'Missing required query parameter: fileName' });
    }
    const signedUrl = await b2Service.getSignedUrl(fileName, parseInt(ttl) || 3600);
    res.json({ url: signedUrl, fileName, expiresIn: parseInt(ttl) || 3600 });
  } catch (err) {
    console.error('[Upload] Signed URL error:', err.message);
    res.status(500).json({ error: 'Failed to generate signed URL', details: err.message });
  }
});

// ── POST /api/upload/document — Upload a general document ──
router.post('/document', ensureB2Ready, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const docType = req.body.type || 'general';
    const fileName = b2Service.generateDocumentFileName(docType, req.file.originalname);

    const result = await b2Service.uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype
    );

    res.json({
      url: result.url,
      fileId: result.fileId,
      fileName: result.fileName,
      type: docType,
    });
  } catch (err) {
    console.error('[Upload] Document upload error:', err.message);
    res.status(500).json({ error: 'Document upload failed', details: err.message });
  }
});

// ── Multer Error Handler ──
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.startsWith('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
