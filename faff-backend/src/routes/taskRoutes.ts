import express from 'express';
import { createTask, getTasks, getTaskById, updateTask, deleteTask } from '../controllers/taskController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all task routes
router.use(authenticate);

// Create a new task
router.post('/', createTask);

// Get all tasks
router.get('/', getTasks);

// Get task by ID
router.get('/:id', getTaskById);

// Update task
router.put('/:id', updateTask);

// Delete task (admin only)
router.delete('/:id', isAdmin, deleteTask);

export default router; 