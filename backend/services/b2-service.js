/**
 * Backblaze B2 Service
 * 
 * Handles file upload, deletion, and URL generation for Backblaze B2 cloud storage.
 * Used for storing menu images, avatars, and documents instead of base64 in MongoDB.
 * 
 * Environment Variables:
 *   B2_APPLICATION_KEY_ID  - Backblaze B2 application key ID
 *   B2_APPLICATION_KEY     - Backblaze B2 application key
 *   B2_BUCKET_NAME         - Bucket name (e.g., "pos-menu-images")
 *   B2_ENDPOINT            - S3-compatible endpoint (e.g., "https://s3.us-west-004.backblazeb2.com")
 *   B2_CDN_URL             - Optional custom CDN domain (e.g., "https://cdn.example.com")
 */

const B2 = require('backblaze-b2');
const path = require('path');

class B2Service {
  constructor() {
    this.b2 = null;
    this.bucketName = process.env.B2_BUCKET_NAME || 'pos-menu-images';
    this.endpoint = process.env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com';
    this.cdnUrl = process.env.B2_CDN_URL || '';
    this.initialized = false;
    this.bucketId = null;
  }

  /**
   * Initialize the B2 client and authenticate.
   * Must be called before any upload/delete operations.
   */
  async initialize() {
    if (this.initialized) return;

    const keyId = process.env.B2_APPLICATION_KEY_ID;
    const appKey = process.env.B2_APPLICATION_KEY;

    if (!keyId || !appKey) {
      console.warn('[B2Service] B2 credentials not configured. B2 uploads will be disabled.');
      this.initialized = false;
      return;
    }

    try {
      this.b2 = new B2({
        applicationKeyId: keyId,
        applicationKey: appKey,
      });

      await this.b2.authorize();

      // Get bucket ID
      const buckets = await this.b2.listBuckets();
      const bucket = buckets.data.buckets.find(b => b.bucketName === this.bucketName);
      if (!bucket) {
        console.warn(`[B2Service] Bucket "${this.bucketName}" not found. Create it in the Backblaze B2 console.`);
        this.initialized = false;
        return;
      }

      this.bucketId = bucket.bucketId;
      this.initialized = true;
      console.log(`[B2Service] Initialized successfully. Bucket: ${this.bucketName}`);
    } catch (err) {
      console.error('[B2Service] Initialization failed:', err.message);
      this.initialized = false;
    }
  }

  /**
   * Check if the service is ready.
   */
  isReady() {
    return this.initialized && this.b2 !== null;
  }

  /**
   * Upload a file buffer to Backblaze B2.
   * 
   * @param {Buffer} buffer - File content as Buffer
   * @param {string} fileName - Destination path in bucket (e.g., "menu/abc123_1680000000.jpg")
   * @param {string} contentType - MIME type (e.g., "image/jpeg")
   * @returns {Promise<{fileId: string, fileName: string, url: string}>}
   */
  async uploadFile(buffer, fileName, contentType) {
    if (!this.isReady()) {
      throw new Error('B2Service is not initialized. Check B2 credentials.');
    }

    try {
      // Get upload URL
      const uploadUrl = await this.b2.getUploadUrl(this.bucketId);
      const { uploadUrl: url, authorizationToken } = uploadUrl.data;

      // Upload the file
      const response = await this.b2.uploadFile({
        uploadUrl: url,
        uploadAuthToken: authorizationToken,
        fileName,
        data: buffer,
        contentType: contentType || 'application/octet-stream',
      });

      const { fileId, fileName: uploadedName } = response.data;

      return {
        fileId,
        fileName: uploadedName,
        url: this.getFileUrl(uploadedName),
      };
    } catch (err) {
      console.error('[B2Service] Upload failed:', err.message);
      throw err;
    }
  }

  /**
   * Delete a file from Backblaze B2 by fileName and fileId.
   * 
   * @param {string} fileName - The file name/path in the bucket
   * @param {string} fileId - The file ID returned from upload
   * @returns {Promise<boolean>} - true if deleted successfully
   */
  async deleteFile(fileName, fileId) {
    if (!this.isReady()) {
      throw new Error('B2Service is not initialized. Check B2 credentials.');
    }

    try {
      await this.b2.deleteFileVersion({
        fileId,
        fileName,
      });
      return true;
    } catch (err) {
      console.error('[B2Service] Delete failed:', err.message);
      throw err;
    }
  }

  /**
   * Generate the public URL for a file.
   * Uses CDN URL if configured, otherwise falls back to direct B2 download URL.
   *
   * @param {string} fileName - The file name/path in the bucket
   * @returns {string} - Public URL
   */
  getFileUrl(fileName) {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/file/${this.bucketName}/${fileName}`;
    }
    return `${this.endpoint}/${this.bucketName}/${fileName}`;
  }

  /**
   * Generate a signed (authorized) download URL for a private bucket file.
   * The URL includes a temporary authorization token valid for a limited time.
   *
   * B2's getDownloadAuthorization creates a token scoped to a specific file prefix
   * with a configurable TTL (max 604800 seconds = 7 days).
   *
   * For single-file access, we use the fileName as the prefix so the token
   * only authorizes that specific file.
   *
   * @param {string} fileName - The file name/path in the bucket
   * @param {number} ttlSeconds - Time-to-live in seconds (default: 3600 = 1 hour)
   * @returns {Promise<string>} - Signed download URL with authorization token
   */
  async getSignedUrl(fileName, ttlSeconds = 3600) {
    if (!this.isReady()) {
      throw new Error('B2Service is not initialized. Check B2 credentials.');
    }

    try {
      // Use a directory prefix so the token covers the file
      const prefix = fileName.substring(0, fileName.lastIndexOf('/') + 1) || fileName;
      const response = await this.b2.getDownloadAuthorization({
        bucketId: this.bucketId,
        fileNamePrefix: prefix,
        validDurationInSeconds: Math.min(ttlSeconds, 604800), // Max 7 days
      });

      const { authorizationToken } = response.data;
      // Extract cluster number from endpoint: s3.us-east-005 → f005
      const endpointHost = new URL(this.endpoint).hostname; // s3.us-east-005.backblazeb2.com
      const clusterMatch = endpointHost.match(/s3\.([^.]+)/);
      const cluster = clusterMatch ? clusterMatch[1] : '005'; // us-east-005
      const clusterNum = cluster.split('-').pop(); // 005
      const downloadHost = this.cdnUrl || `https://f${clusterNum}.backblazeb2.com`;
      return `${downloadHost}/file/${this.bucketName}/${fileName}?Authorization=${authorizationToken}`;
    } catch (err) {
      console.error('[B2Service] Failed to generate signed URL:', err.message);
      // Fallback: return the unsigned URL (will 401 if bucket is private)
      return this.getFileUrl(fileName);
    }
  }

  /**
   * Generate signed URLs for multiple files in batch.
   *
   * @param {string[]} fileNames - Array of file name/path strings
   * @param {number} ttlSeconds - Time-to-live in seconds (default: 3600)
   * @returns {Promise<Object<string, string>>} - Map of fileName → signed URL
   */
  async getSignedUrls(fileNames, ttlSeconds = 3600) {
    const urlMap = {};
    for (const fileName of fileNames) {
      urlMap[fileName] = await this.getSignedUrl(fileName, ttlSeconds);
    }
    return urlMap;
  }

  /**
   * List files in the bucket with an optional prefix filter.
   * 
   * @param {string} prefix - Optional prefix to filter by (e.g., "menu/")
   * @returns {Promise<Array<{fileName: string, fileId: string, url: string}>>}
   */
  async listFiles(prefix = '') {
    if (!this.isReady()) {
      throw new Error('B2Service is not initialized. Check B2 credentials.');
    }

    try {
      const response = await this.b2.listFileNames({
        bucketId: this.bucketId,
        prefix,
        maxFileCount: 100,
      });

      return response.data.files.map(file => ({
        fileName: file.fileName,
        fileId: file.fileId,
        url: this.getFileUrl(file.fileName),
      }));
    } catch (err) {
      console.error('[B2Service] List files failed:', err.message);
      throw err;
    }
  }

  /**
   * Generate a unique file name for a menu item image.
   * Format: menu/{itemId}_{timestamp}.{ext}
   * 
   * @param {string} itemId - MongoDB ObjectId of the menu item
   * @param {string} originalName - Original file name (used to extract extension)
   * @returns {string} - Unique file path
   */
  generateFileName(itemId, originalName) {
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const timestamp = Date.now();
    return `menu/${itemId}_${timestamp}${ext}`;
  }

  /**
   * Generate a unique file name for an avatar.
   * Format: avatars/{itemId}_{timestamp}.{ext}
   */
  generateAvatarFileName(itemId, originalName) {
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const timestamp = Date.now();
    return `avatars/${itemId}_${timestamp}${ext}`;
  }

  /**
   * Generate a unique file name for a document.
   * Format: documents/{type}_{timestamp}.{ext}
   */
  generateDocumentFileName(type, originalName) {
    const ext = path.extname(originalName).toLowerCase() || '.pdf';
    const timestamp = Date.now();
    return `documents/${type}_${timestamp}${ext}`;
  }
}

// Singleton instance
const b2Service = new B2Service();

module.exports = b2Service;
