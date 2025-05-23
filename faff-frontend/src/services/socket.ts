import { io, Socket } from 'socket.io-client';
import type { Message, TypingUser, Attachment } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private currentTaskId: number | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io("https://faff-assign.onrender.com", {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentTaskId = null;
    }
  }

  joinTask(taskId: number) {
    if (this.socket && this.currentTaskId !== taskId) {
      this.socket.emit('join_task', taskId);
      this.currentTaskId = taskId;
    }
  }

  sendMessage(data: {
    taskId: number;
    content: string;
    replyToId?: number;
    attachments?: Attachment[];
  }) {
    if (this.socket) {
      this.socket.emit('send_message', data);
    }
  }

  sendTyping(taskId: number, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit('typing', { taskId, isTyping });
    }
  }

  notifyTaskUpdate(taskId: number) {
    if (this.socket) {
      this.socket.emit('task_updated', taskId);
    }
  }

  sendUploadProgress(taskId: number, progress: number, filename: string) {
    if (this.socket) {
      this.socket.emit('upload_progress', { taskId, progress, filename });
    }
  }

  // Event listeners
  onNewMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onUserTyping(callback: (data: TypingUser) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onTaskRefresh(callback: (data: { taskId: number }) => void) {
    if (this.socket) {
      this.socket.on('refresh_task', callback);
    }
  }

  onFileUploadProgress(callback: (data: {
    userId: number;
    userName: string;
    progress: number;
    filename: string;
  }) => void) {
    if (this.socket) {
      this.socket.on('file_upload_progress', callback);
    }
  }

  onError(callback: (data: { message: string }) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove event listeners
  offNewMessage(callback?: (message: Message) => void) {
    if (this.socket) {
      this.socket.off('new_message', callback);
    }
  }

  offUserTyping(callback?: (data: TypingUser) => void) {
    if (this.socket) {
      this.socket.off('user_typing', callback);
    }
  }

  offTaskRefresh(callback?: (data: { taskId: number }) => void) {
    if (this.socket) {
      this.socket.off('refresh_task', callback);
    }
  }

  offFileUploadProgress(callback?: (data: {
    userId: number;
    userName: string;
    progress: number;
    filename: string;
  }) => void) {
    if (this.socket) {
      this.socket.off('file_upload_progress', callback);
    }
  }

  offError(callback?: (data: { message: string }) => void) {
    if (this.socket) {
      this.socket.off('error', callback);
    }
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService; 