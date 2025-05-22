import { Request, Response } from 'express';
import { Message, User, Task } from '../models';
import { processUploadedFiles, deleteAttachmentFiles } from '../services/fileService';
import { Attachment } from '../models/Message';

// Create a new message
export const createMessage = async (req: Request, res: Response) => {
  try {
    const { taskId, content, replyToId } = req.body;
    const senderId = (req as any).user.id;
    const files = (req.files as Express.Multer.File[]) || [];

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      // Clean up any uploaded files before returning error
      if (files.length > 0) {
        const attachments = processUploadedFiles(files);
        await deleteAttachmentFiles(attachments);
      }
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if replyToId is valid (if provided)
    if (replyToId) {
      const replyMessage = await Message.findByPk(replyToId);
      if (!replyMessage) {
        // Clean up any uploaded files before returning error
        if (files.length > 0) {
          const attachments = processUploadedFiles(files);
          await deleteAttachmentFiles(attachments);
        }
        return res.status(404).json({ message: 'Reply message not found' });
      }
      
      // Ensure the reply message belongs to the same task
      if (replyMessage.taskId !== parseInt(taskId)) {
        // Clean up any uploaded files before returning error
        if (files.length > 0) {
          const attachments = processUploadedFiles(files);
          await deleteAttachmentFiles(attachments);
        }
        return res.status(400).json({ message: 'Reply message does not belong to the same task' });
      }
    }

    // Process uploaded files
    const attachments = files.length > 0 ? processUploadedFiles(files) : [];

    // Create message
    const message = await Message.create({
      taskId,
      senderId,
      content,
      replyToId: replyToId || null,
      attachments
    });

    // Fetch the created message with sender info
    const messageWithDetails = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
        { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }] }
      ]
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithDetails
    });
  } catch (error) {
    console.error('Create message error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get messages for a task
export const getTaskMessages = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Fetch messages with pagination
    const { count, rows } = await Message.findAndCountAll({
      where: { taskId },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'replyTo', 
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }] 
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'ASC']]
    });

    return res.status(200).json({
      messages: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get task messages error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get message thread (a message and its replies)
export const getMessageThread = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);

    // Get the parent message
    const parentMessage = await Message.findByPk(messageId, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }]
    });

    if (!parentMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Get all replies to the message
    const replies = await Message.findAll({
      where: { replyToId: messageId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'ASC']]
    });

    return res.status(200).json({
      parentMessage,
      replies
    });
  } catch (error) {
    console.error('Get message thread error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Update a message
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = (req as any).user.id;
    const files = (req.files as Express.Multer.File[]) || [];

    const message = await Message.findByPk(messageId);

    if (!message) {
      // Clean up any uploaded files before returning error
      if (files.length > 0) {
        const attachments = processUploadedFiles(files);
        await deleteAttachmentFiles(attachments);
      }
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender can update their own message
    if (message.senderId !== userId) {
      // Clean up any uploaded files before returning error
      if (files.length > 0) {
        const attachments = processUploadedFiles(files);
        await deleteAttachmentFiles(attachments);
      }
      return res.status(403).json({ message: 'Not authorized to update this message' });
    }

    // Process new uploaded files, if any
    const newAttachments = files.length > 0 ? processUploadedFiles(files) : [];

    // Combine existing and new attachments
    const updatedAttachments = [...message.attachments, ...newAttachments];

    // Update message
    await message.update({
      content: content || message.content,
      attachments: updatedAttachments
    });

    // Fetch updated message with associations
    const updatedMessage = await Message.findByPk(messageId, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'replyTo', 
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }] 
        }
      ]
    });

    return res.status(200).json({
      message: 'Message updated successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Update message error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Delete a message
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender or an admin can delete the message
    if (message.senderId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // Delete attachment files if any
    if (message.attachments && message.attachments.length > 0) {
      await deleteAttachmentFiles(message.attachments as Attachment[]);
    }

    await message.destroy();

    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Remove an attachment from a message
export const removeAttachment = async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const { attachmentId } = req.body;
    const userId = (req as any).user.id;

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender can remove attachments
    if (message.senderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this message' });
    }

    // Find the attachment to remove
    const attachmentToRemove = message.attachments.find(
      (attachment: Attachment) => attachment.id === attachmentId
    );

    if (!attachmentToRemove) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Delete the file
    await deleteAttachmentFiles([attachmentToRemove]);

    // Update message attachments
    const updatedAttachments = message.attachments.filter(
      (attachment: Attachment) => attachment.id !== attachmentId
    );

    await message.update({
      attachments: updatedAttachments
    });

    // Fetch updated message with associations
    const updatedMessage = await Message.findByPk(messageId, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'replyTo', 
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }] 
        }
      ]
    });

    return res.status(200).json({
      message: 'Attachment removed successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Remove attachment error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
}; 