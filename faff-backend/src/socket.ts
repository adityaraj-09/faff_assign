import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, Message, Task } from './models';
import { Attachment } from './models/Message';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    email: string;
    role: string;
    name?: string;
  };
}

// Handle socket authentication
const authenticateSocket = async (socket: AuthenticatedSocket, next: Function) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'faff_secret_key') as any;
    
    // Check if user exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Attach user to socket
    socket.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    
    next();
  } catch (error) {
    return next(new Error(`Authentication error: ${(error as Error).message}`));
  }
};

// Set up socket.io handlers
const setupWebSocketHandlers = (io: SocketServer) => {
  // Apply authentication middleware
  io.use(authenticateSocket);
  
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.email} (${socket.id})`);
    
    // Join task room
    socket.on('join_task', (taskId: number) => {
      // Leave all other task rooms
      Object.keys(socket.rooms).forEach(room => {
        if (room !== socket.id && room.startsWith('task_')) {
          socket.leave(room);
        }
      });
      
      // Join new task room
      const roomName = `task_${taskId}`;
      socket.join(roomName);
      console.log(`User ${socket.user?.email} joined room: ${roomName}`);
    });
    
    // Handle new message
    socket.on('send_message', async (messageData: {
      taskId: number;
      content: string;
      replyToId?: number;
      attachments?: Attachment[];
    }) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        const { taskId, content, replyToId, attachments } = messageData;
        
        // Check if task exists
        const task = await Task.findByPk(taskId);
        if (!task) {
          socket.emit('error', { message: 'Task not found' });
          return;
        }
        
        // Check if replyToId is valid (if provided)
        if (replyToId) {
          const replyMessage = await Message.findByPk(replyToId);
          if (!replyMessage) {
            socket.emit('error', { message: 'Reply message not found' });
            return;
          }
          
          // Ensure the reply message belongs to the same task
          if (replyMessage.taskId !== taskId) {
            socket.emit('error', { message: 'Reply message does not belong to the same task' });
            return;
          }
        }
        
        // Create message
        const message = await Message.create({
          taskId,
          senderId: socket.user.id,
          content,
          replyToId: replyToId || null,
          attachments: attachments || []
        });
        
        // Fetch the created message with sender info
        const messageWithDetails = await Message.findByPk(message.id, {
          include: [
            { model: User, as: 'sender', attributes: ['id', 'name', 'email'] },
            { model: Message, as: 'replyTo', include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }] }
          ]
        });
        
        // Broadcast to all clients in the task room
        const roomName = `task_${taskId}`;
        io.to(roomName).emit('new_message', messageWithDetails);
        
        console.log(`New message in task ${taskId} from user ${socket.user.email}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: (error as Error).message });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data: { taskId: number; isTyping: boolean }) => {
      if (!socket.user) return;
      
      const { taskId, isTyping } = data;
      const roomName = `task_${taskId}`;
      
      // Broadcast typing status to all clients in the task room except sender
      socket.to(roomName).emit('user_typing', {
        userId: socket.user.id,
        userName: socket.user.name || socket.user.email,
        isTyping
      });
    });
    
    // Handle task updates (status changes, assignments, etc.)
    socket.on('task_updated', (taskId: number) => {
      const roomName = `task_${taskId}`;
      io.to(roomName).emit('refresh_task', { taskId });
    });
    
    // Handle file upload progress updates
    socket.on('upload_progress', (data: { taskId: number; progress: number; filename: string }) => {
      if (!socket.user) return;
      
      const { taskId, progress, filename } = data;
      const roomName = `task_${taskId}`;
      
      // Broadcast upload progress to all clients in the task room
      io.to(roomName).emit('file_upload_progress', {
        userId: socket.user.id,
        userName: socket.user.name || socket.user.email,
        progress,
        filename
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.email} (${socket.id})`);
    });
  });
};

export default setupWebSocketHandlers; 