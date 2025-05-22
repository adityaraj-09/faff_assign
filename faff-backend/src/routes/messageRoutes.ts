import express from 'express';
import { createMessage, getTaskMessages, getMessageThread, updateMessage, deleteMessage, removeAttachment } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { messageUpload } from '../config/upload';

const router = express.Router();

// Apply authentication middleware to all message routes
router.use(authenticate);

// Create a new message with file attachments
router.post('/', messageUpload.array('files', 5), createMessage);

// Get messages for a task
router.get('/task/:taskId', getTaskMessages);

// Get message thread (message and its replies)
router.get('/thread/:id', getMessageThread);

// Update a message, optionally adding more attachments
router.put('/:id', messageUpload.array('files', 5), updateMessage);

// Delete a message and its attachments
router.delete('/:id', deleteMessage);

// Remove a specific attachment from a message
router.delete('/:id/attachment', removeAttachment);

export default router; 