/**
 * Smart Image Processor — POS Menu Image Optimization
 * 
 * Resizes and compresses images before uploading to Backblaze B2.
 * Ensures menu card images are optimized for POS display (120px height cards)
 * while keeping file sizes small for fast loading and reduced B2 storage costs.
 * 
 * Algorithm:
 *   1. Skip processing if image is already small (< 100KB)
 *   2. Resize to max 800px width (maintains aspect ratio)
 *   3. Convert to JPEG
 *   4. Iteratively reduce quality until under target size (200KB)
 * 
 * Dependencies: sharp (npm install sharp)
 */

const sharp = require('sharp');

class ImageProcessor {
  // ── Menu Image Targets ──
  static MENU_IMAGE_MAX_WIDTH = 800;
  static MENU_IMAGE_MAX_HEIGHT = 600;
  static MENU_IMAGE_TARGET_SIZE = 200 * 1024; // 200KB
  static MENU_IMAGE_QUALITY_START = 85;
  static MENU_IMAGE_QUALITY_MIN = 40;
  static MENU_IMAGE_QUALITY_STEP = 5;

  // ── Thumbnail Targets (inventory list, 48px display) ──
  static THUMBNAIL_MAX_WIDTH = 200;
  static THUMBNAIL_TARGET_SIZE = 50 * 1024; // 50KB

  // ── Avatar Targets (square crop, 200x200) ──
  static AVATAR_SIZE = 200;
  static AVATAR_TARGET_SIZE = 50 * 1024; // 50KB

  // ── Skip threshold: images under this size won't be processed ──
  static SKIP_PROCESSING_THRESHOLD = 100 * 1024; // 100KB

  // ── Allowed input formats ──
  static ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'gif', 'tiff'];

  /**
   * Check if an image needs processing based on file size.
   * Small images (< 100KB) are likely already optimized and can skip processing.
   * 
   * @param {Buffer} buffer - Raw image buffer
   * @returns {boolean} - true if processing is needed
   */
  needsProcessing(buffer) {
    return buffer.length > ImageProcessor.SKIP_PROCESSING_THRESHOLD;
  }

  /**
   * Process a menu item image for card display.
   * 
   * Pipeline:
   *   1. Get metadata (dimensions, format)
   *   2. Resize to max 800px width (maintain aspect ratio, never upscale)
   *   3. Convert to JPEG
   *   4. Iterative quality reduction until ≤ 200KB or min quality reached
   * 
   * @param {Buffer} inputBuffer - Raw image buffer from multer
   * @param {string} mimeType - Original MIME type (e.g., "image/jpeg")
   * @returns {Promise<{buffer: Buffer, mimeType: string, width: number, height: number, size: number, originalSize: number, quality: number}>}
   */
  async processMenuImage(inputBuffer, mimeType) {
    const originalSize = inputBuffer.length;
    let pipeline = sharp(inputBuffer);

    // Get metadata first
    const metadata = await pipeline.metadata();
    const format = metadata.format || 'jpeg';

    // Step 1: Resize if wider than max width
    if (metadata.width && metadata.width > ImageProcessor.MENU_IMAGE_MAX_WIDTH) {
      pipeline = pipeline.resize({
        width: ImageProcessor.MENU_IMAGE_MAX_WIDTH,
        withoutEnlargement: true,
        fit: 'inside', // Maintain aspect ratio, fit within max dimensions
      });
    }

    // Also constrain height
    if (metadata.height && metadata.height > ImageProcessor.MENU_IMAGE_MAX_HEIGHT) {
      pipeline = pipeline.resize({
        height: ImageProcessor.MENU_IMAGE_MAX_HEIGHT,
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    // Step 2: Convert to JPEG and iteratively compress
    let quality = ImageProcessor.MENU_IMAGE_QUALITY_START;
    let processed;
    let finalQuality = quality;

    while (quality >= ImageProcessor.MENU_IMAGE_QUALITY_MIN) {
      processed = await pipeline
        .jpeg({ quality, mozjpeg: true }) // mozjpeg for better compression
        .toBuffer();

      if (processed.length <= ImageProcessor.MENU_IMAGE_TARGET_SIZE) {
        finalQuality = quality;
        break;
      }
      quality -= ImageProcessor.MENU_IMAGE_QUALITY_STEP;
    }

    // If even min quality is too large, accept it (better than failing)
    if (!processed) {
      processed = await pipeline
        .jpeg({ quality: ImageProcessor.MENU_IMAGE_QUALITY_MIN, mozjpeg: true })
        .toBuffer();
      finalQuality = ImageProcessor.MENU_IMAGE_QUALITY_MIN;
    }

    // Get final dimensions
    const finalMetadata = await sharp(processed).metadata();

    const result = {
      buffer: processed,
      mimeType: 'image/jpeg',
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
      size: processed.length,
      originalSize,
      quality: finalQuality,
      compressionRatio: ((1 - processed.length / originalSize) * 100).toFixed(1),
    };

    console.log(
      `[ImageProcessor] Menu image: ${(originalSize / 1024).toFixed(1)}KB → ${(processed.length / 1024).toFixed(1)}KB ` +
      `(${result.compressionRatio}% reduction), ${result.width}x${result.height}, quality=${finalQuality}`
    );

    return result;
  }

  /**
   * Process a thumbnail image (for inventory list, 48px display).
   * 
   * @param {Buffer} inputBuffer - Raw image buffer
   * @param {string} mimeType - Original MIME type
   * @returns {Promise<{buffer: Buffer, mimeType: string, width: number, height: number, size: number}>}
   */
  async processThumbnail(inputBuffer, mimeType) {
    const originalSize = inputBuffer.length;

    const processed = await sharp(inputBuffer)
      .resize({
        width: ImageProcessor.THUMBNAIL_MAX_WIDTH,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const metadata = await sharp(processed).metadata();

    console.log(
      `[ImageProcessor] Thumbnail: ${(originalSize / 1024).toFixed(1)}KB → ${(processed.length / 1024).toFixed(1)}KB`
    );

    return {
      buffer: processed,
      mimeType: 'image/jpeg',
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: processed.length,
      originalSize,
    };
  }

  /**
   * Process an avatar image (square crop, 200x200).
   * 
   * @param {Buffer} inputBuffer - Raw image buffer
   * @param {string} mimeType - Original MIME type
   * @returns {Promise<{buffer: Buffer, mimeType: string, width: number, height: number, size: number}>}
   */
  async processAvatar(inputBuffer, mimeType) {
    const originalSize = inputBuffer.length;

    const processed = await sharp(inputBuffer)
      .resize({
        width: ImageProcessor.AVATAR_SIZE,
        height: ImageProcessor.AVATAR_SIZE,
        fit: 'cover', // Crop to fill square
        position: 'centre',
      })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();

    const metadata = await sharp(processed).metadata();

    console.log(
      `[ImageProcessor] Avatar: ${(originalSize / 1024).toFixed(1)}KB → ${(processed.length / 1024).toFixed(1)}KB`
    );

    return {
      buffer: processed,
      mimeType: 'image/jpeg',
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: processed.length,
      originalSize,
    };
  }

  /**
   * Get image metadata without processing.
   * 
   * @param {Buffer} buffer - Image buffer
   * @returns {Promise<{format: string, width: number, height: number, size: number}>}
   */
  async getMetadata(buffer) {
    const metadata = await sharp(buffer).metadata();
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: buffer.length,
    };
  }
}

// Singleton instance
const imageProcessor = new ImageProcessor();

module.exports = imageProcessor;
