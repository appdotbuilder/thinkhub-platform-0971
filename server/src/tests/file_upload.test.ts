
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type FileUploadInput } from '../schema';
import { generateUploadUrl, confirmFileUpload, deleteFile } from '../handlers/file_upload';

// Test input for file upload
const testFileInput: FileUploadInput = {
  file_name: 'test-document.pdf',
  file_type: 'application/pdf',
  file_size: 1024 * 1024 // 1MB
};

describe('generateUploadUrl', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate upload URL for valid file input', async () => {
    const result = await generateUploadUrl(testFileInput);

    expect(result.uploadUrl).toBeDefined();
    expect(result.fileId).toBeDefined();
    expect(result.uploadUrl).toMatch(/^https:\/\/s3\.amazonaws\.com\/bucket\//);
    expect(result.fileId).toMatch(/^file_\d+_[a-z0-9]+$/);
  });

  it('should generate different file IDs for multiple requests', async () => {
    const result1 = await generateUploadUrl(testFileInput);
    const result2 = await generateUploadUrl(testFileInput);

    expect(result1.fileId).not.toEqual(result2.fileId);
    expect(result1.uploadUrl).not.toEqual(result2.uploadUrl);
  });

  it('should handle different file types', async () => {
    const imageInput: FileUploadInput = {
      file_name: 'profile.jpg',
      file_type: 'image/jpeg',
      file_size: 512 * 1024
    };

    const result = await generateUploadUrl(imageInput);

    expect(result.uploadUrl).toBeDefined();
    expect(result.fileId).toBeDefined();
    expect(result.uploadUrl).toContain('profile.jpg');
  });

  it('should clean unsafe characters from filename', async () => {
    const unsafeInput: FileUploadInput = {
      file_name: 'my file with spaces & symbols!.pdf',
      file_type: 'application/pdf',
      file_size: 1024
    };

    const result = await generateUploadUrl(unsafeInput);

    expect(result.uploadUrl).toContain('my_file_with_spaces___symbols_.pdf');
  });

  it('should reject files that are too large', async () => {
    const largeFileInput: FileUploadInput = {
      file_name: 'huge-file.zip',
      file_type: 'application/zip',
      file_size: 200 * 1024 * 1024 // 200MB
    };

    await expect(generateUploadUrl(largeFileInput)).rejects.toThrow(/file size exceeds maximum/i);
  });

  it('should reject unsupported file types', async () => {
    const unsupportedInput: FileUploadInput = {
      file_name: 'script.exe',
      file_type: 'application/x-executable',
      file_size: 1024
    };

    await expect(generateUploadUrl(unsupportedInput)).rejects.toThrow(/file type.*is not allowed/i);
  });
});

describe('confirmFileUpload', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should confirm file upload with valid file ID', async () => {
    // First generate an upload URL to get a valid file ID
    const uploadResult = await generateUploadUrl(testFileInput);
    
    const result = await confirmFileUpload(uploadResult.fileId);

    expect(result.success).toBe(true);
    expect(result.fileUrl).toBeDefined();
    expect(result.fileUrl).toMatch(/^https:\/\/cdn\.example\.com\/files\/file_/);
    expect(result.fileUrl).toContain(uploadResult.fileId);
  });

  it('should reject invalid file ID format', async () => {
    await expect(confirmFileUpload('invalid-id')).rejects.toThrow(/invalid file id format/i);
  });

  it('should reject empty file ID', async () => {
    await expect(confirmFileUpload('')).rejects.toThrow(/invalid file id format/i);
  });
});

describe('deleteFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete file with valid file ID', async () => {
    // First generate an upload URL to get a valid file ID
    const uploadResult = await generateUploadUrl(testFileInput);
    
    const result = await deleteFile(uploadResult.fileId);

    expect(result.success).toBe(true);
  });

  it('should reject invalid file ID format', async () => {
    await expect(deleteFile('invalid-id')).rejects.toThrow(/invalid file id format/i);
  });

  it('should reject empty file ID', async () => {
    await expect(deleteFile('')).rejects.toThrow(/invalid file id format/i);
  });
});

describe('file upload workflow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete full upload workflow', async () => {
    // Step 1: Generate upload URL
    const uploadResult = await generateUploadUrl(testFileInput);
    expect(uploadResult.fileId).toBeDefined();
    expect(uploadResult.uploadUrl).toBeDefined();

    // Step 2: Confirm upload (simulating successful upload to cloud storage)
    const confirmResult = await confirmFileUpload(uploadResult.fileId);
    expect(confirmResult.success).toBe(true);
    expect(confirmResult.fileUrl).toBeDefined();

    // Step 3: Delete file (cleanup)
    const deleteResult = await deleteFile(uploadResult.fileId);
    expect(deleteResult.success).toBe(true);
  });
});
