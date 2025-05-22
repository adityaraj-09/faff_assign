import { Request, Response } from 'express';
import { Summary, Task, Message, User } from '../models';
import { generateTaskSummary } from '../services/openaiService';

// Helper function to extract entities (URLs, phone numbers, etc.)
const extractEntities = (messages: Message[]): string[] => {
  const entities: string[] = [];
  
  // URL regex pattern
  const urlPattern = /https?:\/\/[^\s]+/g;
  
  // Phone number regex pattern (basic pattern, can be enhanced)
  const phonePattern = /(\+\d{1,3}\s?)?(\(\d{1,4}\)\s?)?(\d{1,4}[-\s]?){2,}/g;
  
  messages.forEach(message => {
    // Extract URLs
    const urls = message.content.match(urlPattern);
    if (urls) {
      entities.push(...urls);
    }
    
    // Extract phone numbers
    const phones = message.content.match(phonePattern);
    if (phones) {
      entities.push(...phones);
    }
  });
  
  // Remove duplicates
  return [...new Set(entities)];
};

// Create or update a summary for a task
export const createSummary = async (req: Request, res: Response) => {
  try {
    const { taskId, content } = req.body;
    const userId = (req as any).user.id;

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get all messages for the task to extract entities
    const messages = await Message.findAll({
      where: { taskId },
      order: [['createdAt', 'ASC']]
    });

    // Extract entities using regex patterns (fallback if OpenAI is not available)
    const extractEntitiesRegex = (messages: Message[]): string[] => {
      const entities: string[] = [];
      
      // URL regex pattern
      const urlPattern = /https?:\/\/[^\s]+/g;
      
      // Phone number regex pattern (basic pattern, can be enhanced)
      const phonePattern = /(\+\d{1,3}\s?)?(\(\d{1,4}\)\s?)?(\d{1,4}[-\s]?){2,}/g;
      
      messages.forEach(message => {
        // Extract URLs
        const urls = message.content.match(urlPattern);
        if (urls) {
          entities.push(...urls);
        }
        
        // Extract phone numbers
        const phones = message.content.match(phonePattern);
        if (phones) {
          entities.push(...phones);
        }
      });
      
      // Remove duplicates
      return [...new Set(entities)];
    };

    // Extract entities using regex (fallback)
    const entitiesFromRegex = extractEntitiesRegex(messages);

    // Check if a summary already exists for this task
    const existingSummary = await Summary.findOne({ where: { taskId } });

    let summary;
    if (existingSummary) {
      // Update existing summary
      summary = await existingSummary.update({
        content,
        createdById: userId,
        entities: entitiesFromRegex
      });
    } else {
      // Create new summary
      summary = await Summary.create({
        taskId,
        createdById: userId,
        content,
        entities: entitiesFromRegex
      });
    }

    // Fetch the summary with associations
    const summaryWithDetails = await Summary.findByPk(summary.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
        { model: Task, as: 'task' }
      ]
    });

    return res.status(201).json({
      message: 'Summary created successfully',
      summary: summaryWithDetails
    });
  } catch (error) {
    console.error('Create summary error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get summary for a task
export const getTaskSummary = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Find summary for task
    const summary = await Summary.findOne({
      where: { taskId },
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!summary) {
      return res.status(404).json({ message: 'No summary found for this task' });
    }

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Get task summary error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Generate a summary automatically from task messages using OpenAI
export const generateSummary = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const userId = (req as any).user.id;

    // Check if task exists
    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Get all messages for the task
    const messages = await Message.findAll({
      where: { taskId },
      include: [{ 
        model: User, 
        as: 'sender', 
        attributes: ['id', 'name'] 
      }],
      order: [['createdAt', 'ASC']]
    });

    if (messages.length === 0) {
      return res.status(400).json({ message: 'No messages found to generate summary' });
    }

    // Generate summary using OpenAI
    const messagesToSummarize = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.get('sender') as { id: number; name: string },
      createdAt: msg.createdAt
    }));
    
    const aiSummary = await generateTaskSummary(messagesToSummarize, task.status);

    // Create or update summary
    const existingSummary = await Summary.findOne({ where: { taskId } });

    let summary;
    if (existingSummary) {
      summary = await existingSummary.update({
        content: aiSummary.content,
        createdById: userId,
        entities: aiSummary.entities
      });
    } else {
      summary = await Summary.create({
        taskId,
        createdById: userId,
        content: aiSummary.content,
        entities: aiSummary.entities
      });
    }

    // Fetch the summary with associations
    const summaryWithDetails = await Summary.findByPk(summary.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
        { model: Task, as: 'task' }
      ]
    });

    return res.status(200).json({
      message: 'Summary generated successfully',
      summary: summaryWithDetails
    });
  } catch (error) {
    console.error('Generate summary error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
}; 