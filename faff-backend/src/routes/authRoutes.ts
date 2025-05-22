import express from 'express';
import { 
  register, 
  login, 
  getCurrentUser, 
  updateProfile, 
  changePassword,
  getAllUsers
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Get all users
router.get('/users', authenticate, getAllUsers);

// Update profile
router.put('/profile', authenticate, updateProfile);

// Change password
router.put('/password', authenticate, changePassword);

export default router; 