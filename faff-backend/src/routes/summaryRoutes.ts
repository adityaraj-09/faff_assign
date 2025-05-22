import express from 'express';
import { createSummary, getTaskSummary, generateSummary } from '../controllers/summaryController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all summary routes
router.use(authenticate);

// Create or update a summary
router.post('/', createSummary);

// Get summary for a task
router.get('/task/:taskId', getTaskSummary);

// Generate a summary automatically
router.post('/generate/:taskId', generateSummary);

export default router; 