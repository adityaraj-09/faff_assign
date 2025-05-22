import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { QAReview, Message, User, Task } from '../models';
import { checkMessageQuality } from '../services/openaiService';

// Request a QA review for a message
export const requestQAReview = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.body;
    const userId = (req as any).user.id;

    // Check if message exists
    const message = await Message.findByPk(messageId, {
      include: [{ model: Task, as: 'task' }]
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if review already exists
    const existingReview = await QAReview.findOne({ where: { messageId } });
    if (existingReview) {
      return res.status(400).json({ message: 'QA review already requested for this message' });
    }

    // Create QA review request
    const review = await QAReview.create({
      messageId,
      reviewerId: userId,
      status: 'pending',
      feedback: null
    });

    // Fetch the review with associations
    const reviewWithDetails = await QAReview.findByPk(review.id, {
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'message',
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
            { model: Task, as: 'task' }
          ] 
        }
      ]
    });

    return res.status(201).json({
      message: 'QA review requested successfully',
      review: reviewWithDetails
    });
  } catch (error) {
    console.error('Request QA review error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get all QA reviews with filtering
export const getQAReviews = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const status = req.query.status as string;
    const taskId = parseInt(req.query.taskId as string) || undefined;
    
    // Build where condition
    const whereCondition: any = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    // Task ID filtering requires joining with messages
    const messageWhere: any = {};
    if (taskId) {
      messageWhere.taskId = taskId;
    }

    // Fetch reviews with pagination and filters
    const { count, rows } = await QAReview.findAndCountAll({
      where: whereCondition,
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'message',
          where: Object.keys(messageWhere).length > 0 ? messageWhere : undefined,
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
            { model: Task, as: 'task' }
          ]
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      reviews: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get QA reviews error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Update a QA review (approve or reject) using OpenAI for automatic QA
export const updateQAReview = async (req: Request, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { status, feedback, useAI = false } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Check if review exists
    const review = await QAReview.findByPk(reviewId, {
      include: [{ 
        model: Message, 
        as: 'message',
        include: [{ model: Task, as: 'task' }]
      }]
    });

    if (!review) {
      return res.status(404).json({ message: 'QA review not found' });
    }

    // Only reviewers or admins can update reviews
    if (review.reviewerId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    let updatedStatus = status;
    let updatedFeedback = feedback;

    // If AI review is requested, use OpenAI to check message quality
    if (useAI) {
      // Get task context (previous messages)
      const message = await Message.findByPk(review.messageId, {
        include: [{ model: Task, as: 'task' }]
      });
      if (!message) {
        return res.status(404).json({ message: 'Associated message not found' });
      }
      const taskId = message.taskId;
      
      // Get all messages for the task before this message
      const previousMessages = await Message.findAll({
        where: { 
          taskId,
          id: { [Op.lt]: review.messageId }
        },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
        order: [['createdAt', 'ASC']]
      });
      
      // Format previous messages for context
      const taskContext = previousMessages.map(msg => {
        const sender = msg.get('sender') as { id: number; name: string };
        return `${sender.name}: ${msg.content}`;
      }).join('\n\n');
      
      // Check message quality using OpenAI
      const aiQAResult = await checkMessageQuality(message.content, taskContext);
      
      // Update status and feedback based on AI results
      updatedStatus = aiQAResult.isApproved ? 'approved' : 'rejected';
      updatedFeedback = aiQAResult.feedback;
    } else {
      // Validate manually provided status
      if (updatedStatus && !['pending', 'approved', 'rejected'].includes(updatedStatus)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
    }

    // Update review
    await review.update({
      status: updatedStatus || review.status,
      feedback: updatedFeedback !== undefined ? updatedFeedback : review.feedback
    });

    // Fetch updated review with associations
    const updatedReview = await QAReview.findByPk(reviewId, {
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'message',
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
            { model: Task, as: 'task' }
          ] 
        }
      ]
    });

    return res.status(200).json({
      message: 'QA review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update QA review error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get QA reviews for a specific task
export const getTaskQAReviews = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Fetch all reviews for messages in the task
    const reviews = await QAReview.findAll({
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
        { 
          model: Message, 
          as: 'message',
          where: { taskId },
          include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ reviews });
  } catch (error) {
    console.error('Get task QA reviews error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
}; 