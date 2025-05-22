export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedToId?: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  assignedTo?: User;
  createdBy?: User;
  messageCount?: number;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export interface Message {
  id: number;
  taskId: number;
  senderId: number;
  content: string;
  replyToId?: number;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  sender: User;
  replyTo?: Message;
  replies?: Message[];
}

export interface Summary {
  id: number;
  taskId: number;
  content: string;
  keyPoints: string[];
  entities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QAReview {
  id: number;
  messageId: number;
  taskId: number;
  reviewerId?: number;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  reviewer?: User;
  message: Message;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: Task['priority'];
  assignedToId?: number;
}

export interface CreateMessageData {
  taskId: number;
  content: string;
  replyToId?: number;
  files?: File[];
}

export interface TypingUser {
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface SocketEvents {
  // Client to Server
  join_task: (taskId: number) => void;
  send_message: (data: {
    taskId: number;
    content: string;
    replyToId?: number;
    attachments?: Attachment[];
  }) => void;
  typing: (data: { taskId: number; isTyping: boolean }) => void;
  task_updated: (taskId: number) => void;
  upload_progress: (data: { taskId: number; progress: number; filename: string }) => void;

  // Server to Client
  new_message: (message: Message) => void;
  user_typing: (data: TypingUser) => void;
  refresh_task: (data: { taskId: number }) => void;
  file_upload_progress: (data: {
    userId: number;
    userName: string;
    progress: number;
    filename: string;
  }) => void;
  error: (data: { message: string }) => void;
} 