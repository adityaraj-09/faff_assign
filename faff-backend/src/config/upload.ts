import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const messageUploadsDir = path.join(uploadDir, 'messages');

// Create directories if they don't exist
[uploadDir, messageUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define file size limits and allowed types
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv',
  // Archives
  'application/zip', 'application/x-rar-compressed'
];

// Storage configuration for message attachments
const messageStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, messageUploadsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate a unique filename to prevent collisions
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`));
  }
};

// Create multer instances for different upload scenarios
export const messageUpload = multer({
  storage: messageStorage,
  limits: {
    fileSize: FILE_SIZE_LIMIT
  },
  fileFilter
});

// Function to get public URL for an uploaded file
export const getFileUrl = (filename: string, type: 'message'): string => {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/uploads/${type}s/${filename}`;
};

// Function to delete a file
export const deleteFile = (filename: string, type: 'message'): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(type === 'message' ? messageUploadsDir : uploadDir, filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file: ${filePath}`, err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}; 