import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { Attachment } from '../models/Message';
import { getFileUrl } from '../config/upload';

/**
 * Process uploaded files for message attachments
 * @param files Array of Express.Multer.File objects
 * @returns Array of Attachment objects
 */
export const processUploadedFiles = (files: Express.Multer.File[]): Attachment[] => {
  return files.map(file => {
    const attachment: Attachment = {
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      url: getFileUrl(file.filename, 'message'),
      mimetype: file.mimetype,
      size: file.size,
      createdAt: new Date()
    };
    return attachment;
  });
};

/**
 * Delete attachment files when a message is deleted
 * @param attachments Array of Attachment objects
 */
export const deleteAttachmentFiles = async (attachments: Attachment[]): Promise<void> => {
  const deletePromises = attachments.map(attachment => {
    return new Promise<void>((resolve, reject) => {
      const filePath = attachment.path;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${filePath}`, err);
          // We'll resolve anyway to continue with other deletions
          resolve();
        } else {
          resolve();
        }
      });
    });
  });

  await Promise.all(deletePromises);
};

/**
 * Check if a file is an image
 * @param mimetype File MIME type
 * @returns boolean
 */
export const isImage = (mimetype: string): boolean => {
  return mimetype.startsWith('image/');
};

/**
 * Get the type of file (document, image, etc.) based on MIME type
 * @param mimetype File MIME type
 * @returns string representing the file type
 */
export const getFileType = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (
    mimetype === 'application/pdf' ||
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document';
  } else if (
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'spreadsheet';
  } else if (
    mimetype === 'application/vnd.ms-powerpoint' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'presentation';
  } else if (mimetype === 'application/zip' || mimetype === 'application/x-rar-compressed') {
    return 'archive';
  } else {
    return 'other';
  }
}; 