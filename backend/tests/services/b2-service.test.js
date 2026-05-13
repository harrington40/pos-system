// Mock the backblaze-b2 module
jest.mock('backblaze-b2', () => {
  return jest.fn().mockImplementation(() => ({
    authorize: jest.fn().mockResolvedValue({ data: { authorizationToken: 'auth-token' } }),
    listBuckets: jest.fn().mockResolvedValue({
      data: {
        buckets: [{ bucketName: 'test-bucket', bucketId: 'BUCKET-001' }],
      },
    }),
    getUploadUrl: jest.fn().mockResolvedValue({
      data: { uploadUrl: 'https://upload.backblazeb2.com/file', authorizationToken: 'upload-token' },
    }),
    uploadFile: jest.fn().mockResolvedValue({
      data: { fileId: 'FILE-001', fileName: 'menu/item_123.jpg' },
    }),
    deleteFileVersion: jest.fn().mockResolvedValue({ data: { fileId: 'FILE-001' } }),
    getDownloadAuthorization: jest.fn().mockResolvedValue({
      data: { authorizationToken: 'download-token' },
    }),
    listFileNames: jest.fn().mockResolvedValue({
      data: {
        files: [
          { fileName: 'menu/item_123.jpg', fileId: 'FILE-001' },
          { fileName: 'menu/item_456.jpg', fileId: 'FILE-002' },
        ],
      },
    }),
  }));
});

// Set env vars BEFORE requiring the singleton
process.env.B2_APPLICATION_KEY_ID = 'test-key-id';
process.env.B2_APPLICATION_KEY = 'test-app-key';
process.env.B2_BUCKET_NAME = 'test-bucket';
process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';

// b2-service exports a singleton instance, not a class
const b2Service = require('../../services/b2-service');

describe('B2Service', () => {
  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(b2Service.initialize()).resolves.not.toThrow();
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      await b2Service.initialize();
      const result = await b2Service.uploadFile(
        Buffer.from('test-image-data'),
        'menu/item_123.jpg',
        'image/jpeg'
      );

      expect(result.fileId).toBe('FILE-001');
      expect(result.fileName).toBe('menu/item_123.jpg');
    });

    it('should handle upload failure', async () => {
      // Reset modules to get a fresh mock
      jest.resetModules();
      process.env.B2_APPLICATION_KEY_ID = 'test-key-id';
      process.env.B2_APPLICATION_KEY = 'test-app-key';
      process.env.B2_BUCKET_NAME = 'test-bucket';
      process.env.B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';

      const B2 = require('backblaze-b2');
      B2.mockImplementation(() => ({
        authorize: jest.fn().mockResolvedValue({ data: { authorizationToken: 'tok' } }),
        listBuckets: jest.fn().mockResolvedValue({
          data: { buckets: [{ bucketName: 'test-bucket', bucketId: 'BUCKET-001' }] },
        }),
        getUploadUrl: jest.fn().mockResolvedValue({
          data: { uploadUrl: 'https://upload.backblazeb2.com/file', authorizationToken: 'upload-token' },
        }),
        uploadFile: jest.fn().mockRejectedValue(new Error('Upload failed')),
      }));

      const b2ServiceFresh = require('../../services/b2-service');
      await b2ServiceFresh.initialize();
      await expect(b2ServiceFresh.uploadFile(
        Buffer.from('data'),
        'test.jpg',
        'image/jpeg'
      )).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      await b2Service.initialize();
      const result = await b2Service.deleteFile('menu/item_123.jpg', 'FILE-001');
      expect(result).toBe(true);
    });
  });

  describe('getFileUrl', () => {
    it('should return the file URL', () => {
      const url = b2Service.getFileUrl('menu/item_123.jpg');
      expect(url).toContain('menu/item_123.jpg');
    });
  });

  describe('getSignedUrl', () => {
    it('should return a signed URL', async () => {
      await b2Service.initialize();
      const result = await b2Service.getSignedUrl('menu/item_123.jpg');
      expect(result).toContain('menu/item_123.jpg');
    });
  });

  describe('getSignedUrls', () => {
    it('should return signed URLs for multiple files', async () => {
      await b2Service.initialize();
      const result = await b2Service.getSignedUrls(['menu/item_123.jpg', 'menu/item_456.jpg']);
      expect(result['menu/item_123.jpg']).toContain('menu/item_123.jpg');
      expect(result['menu/item_456.jpg']).toContain('menu/item_456.jpg');
    });
  });

  describe('listFiles', () => {
    it('should list files with given prefix', async () => {
      await b2Service.initialize();
      const result = await b2Service.listFiles('menu/');
      expect(result).toHaveLength(2);
      expect(result[0].fileName).toBe('menu/item_123.jpg');
    });
  });

  describe('generateFileName', () => {
    it('should generate a valid file name', () => {
      const name = b2Service.generateFileName('item_123', 'photo.jpg');
      expect(name).toMatch(/^menu\/item_123_\d+\.jpg$/);
    });
  });

  describe('generateAvatarFileName', () => {
    it('should generate a valid avatar file name', () => {
      const name = b2Service.generateAvatarFileName('item_123', 'avatar.jpg');
      expect(name).toMatch(/^avatars\/item_123_\d+\.jpg$/);
    });
  });

  describe('generateDocumentFileName', () => {
    it('should generate a valid document file name', () => {
      const name = b2Service.generateDocumentFileName('receipt', 'receipt.pdf');
      expect(name).toMatch(/^documents\/receipt_\d+\.pdf$/);
    });
  });
});
