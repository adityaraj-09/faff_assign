import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Task, User } from '../models';

// Create a new task
export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, assignedToId, priority, tags } = req.body;
    const requestedById = (req as any).user.id;

    const task = await Task.create({
      title,
      requestedById,
      assignedToId: assignedToId || null,
      priority: priority || 'medium',
      tags: tags || [],
      status: 'Logged'
    });

    // Fetch the created task with associated users
    const taskWithDetails = await Task.findByPk(task.id, {
      include: [
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ]
    });

    return res.status(201).json({
      message: 'Task created successfully',
      task: taskWithDetails
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get all tasks with pagination and filtering
export const getTasks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const assignedToId = parseInt(req.query.assignedToId as string) || undefined;
    const requestedById = parseInt(req.query.requestedById as string) || undefined;
    const search = req.query.search as string;

    // Build where condition
    const whereCondition: any = {};
    
    if (status) {
      whereCondition.status = status;
    }
    
    if (priority) {
      whereCondition.priority = priority;
    }
    
    if (assignedToId) {
      whereCondition.assignedToId = assignedToId;
    }
    
    if (requestedById) {
      whereCondition.requestedById = requestedById;
    }
    
    if (search) {
      whereCondition.title = { [Op.iLike]: `%${search}%` };
    }

    // Fetch tasks with pagination and filters
    const { count, rows } = await Task.findAndCountAll({
      where: whereCondition,
      include: [
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      tasks: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    const task = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({ task });
  } catch (error) {
    console.error('Get task by ID error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const { title, assignedToId, status, priority, tags } = req.body;

    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update task fields
    await task.update({
      title: title || task.title,
      assignedToId: assignedToId !== undefined ? assignedToId : task.assignedToId,
      status: status || task.status,
      priority: priority || task.priority,
      tags: tags || task.tags
    });

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(taskId, {
      include: [
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email'] }
      ]
    });

    return res.status(200).json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.destroy();

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
}; 