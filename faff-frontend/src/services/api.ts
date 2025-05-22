import axios, { type AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type {
  User,
  Task,
  Message,
  Summary,
  QAReview,
  LoginCredentials,
  RegisterCredentials,
  CreateTaskData,
  CreateMessageData,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        
        // Don't show toast for 404 errors
        if (error.response?.status !== 404) {
          const message = (error.response?.data as any)?.message || error.message;
          toast.error(message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginCredentials) {
    const response = await this.api.post('/auth/login', credentials);
    console.log("response", response);
    return response.data;
  }

  async register(credentials: RegisterCredentials) {
    const response = await this.api.post('/auth/register', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get('/auth/me');
    return response.data.user;
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    const response = await this.api.put('/auth/profile', data);
    return response.data;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await this.api.put('/auth/password', data);
  }

  // Task endpoints
  async getTasks(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedTo?: number;
  }): Promise<{
    tasks: Task[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const response = await this.api.get('/tasks', { params });
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.api.get(`/tasks/${id}`);
    return response.data.task;
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await this.api.post('/tasks', data);
    return response.data.data;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const response = await this.api.put(`/tasks/${id}`, data);
    return response.data.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.api.delete(`/tasks/${id}`);
  }

  // Message endpoints
  async getTaskMessages(
    taskId: number,
    params?: { page?: number; limit?: number }
  ): Promise<{
    messages: Message[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const response = await this.api.get(`/messages/task/${taskId}`, { params });
    return response.data;
  }

  async createMessage(data: CreateMessageData): Promise<Message> {
    const formData = new FormData();
    formData.append('taskId', data.taskId.toString());
    formData.append('content', data.content);
    
    if (data.replyToId) {
      formData.append('replyToId', data.replyToId.toString());
    }
    
    if (data.files) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const response = await this.api.post('/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async updateMessage(id: number, data: { content?: string; files?: File[] }): Promise<Message> {
    const formData = new FormData();
    
    if (data.content) {
      formData.append('content', data.content);
    }
    
    if (data.files) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }

    const response = await this.api.put(`/messages/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async deleteMessage(id: number): Promise<void> {
    await this.api.delete(`/messages/${id}`);
  }

  async removeAttachment(messageId: number, attachmentId: string): Promise<Message> {
    const response = await this.api.delete(`/messages/${messageId}/attachment`, {
      data: { attachmentId },
    });
    return response.data.data;
  }

  // Summary endpoints
  async getTaskSummary(taskId: number): Promise<Summary> {
    const response = await this.api.get(`/summaries/task/${taskId}`);
    return response.data.summary;
  }

  async generateSummary(taskId: number): Promise<Summary> {
    const response = await this.api.post(`/summaries/generate/${taskId}`);
    return response.data.data;
  }

  // QA endpoints
  async getQAReviews(params?: {
    taskId?: number;
    status?: string;
  }): Promise<QAReview[]> {
    const response = await this.api.get('/qa', { params });
    return response.data;
  }

  async createQAReview(data: {
    messageId: number;
    taskId: number;
  }): Promise<QAReview> {
    const response = await this.api.post('/qa', data);
    return response.data.data;
  }

  async updateQAReview(
    id: number,
    data: { status: 'approved' | 'rejected'; feedback?: string }
  ): Promise<QAReview> {
    const response = await this.api.put(`/qa/${id}`, data);
    return response.data.data;
  }

  // Users endpoint
  async getUsers(): Promise<User[]> {
    const response = await this.api.get('/auth/users');
    return response.data.users;
  }
}

export const apiService = new ApiService();
export default apiService; 