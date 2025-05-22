import express from 'express';
import { requestQAReview, getQAReviews, updateQAReview, getTaskQAReviews } from '../controllers/qaController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all QA routes
router.use(authenticate);

// Request a QA review
router.post('/', requestQAReview);

// Get all QA reviews
router.get('/', getQAReviews);

// Get QA reviews for a task
router.get('/task/:taskId', getTaskQAReviews);

// Update a QA review (approve/reject)
router.put('/:id', updateQAReview);

export default router; 