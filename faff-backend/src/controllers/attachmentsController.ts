import { Request, Response } from 'express';
import { Task } from '../models';
import { processUploadedFiles } from '../services/fileService';

// Upload attachments without creating a message
export const uploadAttachments = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.body;
    const userId = (req as any).user.id;
    const files = (req.files as Express.Multer.File[]) || [];

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    if (files.length === 0) {
      return res.status(400).json({ message: 'No files were uploaded' });
    }

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Process uploaded files
    const attachments = processUploadedFiles(files);

    return res.status(200).json({
      message: 'Files uploaded successfully',
      attachments
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
}; 