import User from './User';
import Task from './Task';
import Message from './Message';
import Summary from './Summary';
import QAReview from './QAReview';
import sequelize from '../config/database';

// Initialize models in order
const models = [
  User,   // First, as it's referenced by other models
  Task,   // Depends on User
  Message, // Depends on User and Task
  Summary, // Depends on User and Task
  QAReview // Depends on User and Message
];

export {
  User,
  Task,
  Message,
  Summary,
  QAReview,
  sequelize
}; 