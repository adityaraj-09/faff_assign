# Faff Backend - Internal Ticketing & Chat System

A robust Node.js backend for Faff, an internal ticketing interface with real-time threaded chat and task management. Built with Express, TypeScript, and PostgreSQL for scalability and type safety.

## 🏗️ System Architecture

### Design Philosophy
The backend follows enterprise-grade patterns with emphasis on:
- **Microservice-ready architecture** with clear separation of concerns
- **Real-time capabilities** using WebSocket connections
- **Data consistency** with ACID transactions and proper locking
- **Scalability** through stateless design and horizontal scaling support
- **Security** with comprehensive authentication and authorization
- **AI Integration** for intelligent content processing and insights

### Tech Stack
- **Node.js** - Runtime environment
- **Express** - Web application framework
- **TypeScript** - Type safety and developer experience
- **PostgreSQL** - Primary database with JSONB support
- **Sequelize ORM** - Database abstraction and migrations
- **Socket.IO** - Real-time bidirectional communication
- **OpenAI API** - AI-powered summarization and QA
- **Multer** - Multipart file upload handling
- **JWT** - Stateless authentication
- **bcrypt** - Password hashing

## 📁 Project Structure

```
src/
├── controllers/         # Request handlers and business logic
├── models/             # Sequelize database models
├── routes/             # Express route definitions
├── middleware/         # Custom middleware functions
├── services/           # External service integrations
├── utils/              # Utility functions and helpers
├── types/              # TypeScript type definitions
├── config/             # Database and application configuration
└── uploads/            # File upload storage directory
```

## 🎯 Core Features & Implementation

### 1. Database Design & Models

#### Entity Relationship Design
```
Users (1) ─────────── (N) Tasks
  │                      │
  │                      │ (1)
  │                      │
  │ (1)                  │
  │                      ▼
  └─────────────── (N) Messages
                        │ (1)
                        │
                        ▼
                   (N) Attachments

Tasks (1) ────────── (1) Summaries
Messages (1) ────────── (N) QAReviews
```

#### Model Specifications

**Users Model** (`src/models/User.ts`)
```typescript
interface User {
  id: number;
  name: string;
  email: string;        // Unique, indexed
  password: string;     // bcrypt hashed
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}
```

**Tasks Model** (`src/models/Task.ts`)
```typescript
interface Task {
  id: number;
  title: string;
  description: text;    // Supports markdown formatting
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedToId?: number;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  assignedTo?: User;
  createdBy: User;
  messages: Message[];
  summary?: Summary;
}
```

**Messages Model** (`src/models/Message.ts`)
```typescript
interface Message {
  id: number;
  taskId: number;
  senderId: number;
  content: text;
  replyToId?: number;   // For threaded conversations
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  task: Task;
  sender: User;
  replyTo?: Message;
  replies: Message[];
  attachments: Attachment[];
  qaReviews: QAReview[];
}
```

### 2. API Architecture

#### RESTful Design Patterns
The API follows REST principles with additional considerations for real-time features:

```typescript
// Resource-based URLs
GET    /api/tasks                 # List tasks (with pagination)
POST   /api/tasks                 # Create task
GET    /api/tasks/:id             # Get specific task
PUT    /api/tasks/:id             # Update task
DELETE /api/tasks/:id             # Delete task (admin only)

// Nested resource relationships
GET    /api/tasks/:id/messages    # Get messages for task
POST   /api/tasks/:id/messages    # Create message in task
GET    /api/messages/:id/thread   # Get message thread
```

#### Request/Response Flow
```
Client Request → Rate Limiting → Auth Middleware → Route Handler → 
Controller → Service Layer → Database → Response Formatting → Client
```

### 3. Real-time Communication System

#### WebSocket Architecture (`src/services/socketService.ts`)

**Connection Management**:
```typescript
// Room-based messaging for task isolation
socket.join(`task_${taskId}`);

// Event handling with type safety
interface SocketEvents {
  join_task: (taskId: number) => void;
  send_message: (data: MessageData) => void;
  typing: (data: TypingData) => void;
}
```

**Message Broadcasting Strategy**:
- **Task-scoped rooms** prevent cross-task message leakage
- **Acknowledgment system** ensures message delivery
- **Fallback to HTTP** for connection failures
- **Message deduplication** using client-side message IDs

**Hybrid WebSocket + HTTP Pattern**:
```typescript
// Real-time messages via WebSocket
socketService.broadcast('new_message', message, taskId);

// File uploads via HTTP for better error handling
router.post('/messages', upload.array('files'), createMessage);
```

### 4. File Upload & Management System

#### Multi-part Upload Handling (`src/controllers/attachmentsController.ts`)
```typescript
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/messages/',
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueName}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,    // 10MB per file
    files: 5                        // Maximum 5 files per message
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|zip/;
    const isAllowed = allowedTypes.test(file.mimetype);
    cb(null, isAllowed);
  }
});
```

#### File Storage Strategy
- **Local filesystem** for development and small deployments
- **Unique filename generation** to prevent conflicts
- **MIME type validation** for security
- **File size restrictions** to prevent abuse
- **Cleanup on message deletion** to prevent orphaned files

### 5. AI Integration System

#### OpenAI Service (`src/services/openaiService.ts`)

**Summary Generation Algorithm**:
```typescript
async generateSummary(taskId: number): Promise<Summary> {
  // 1. Fetch all messages for the task
  const messages = await Message.findAll({
    where: { taskId },
    include: [User],
    order: [['createdAt', 'ASC']]
  });

  // 2. Format conversation for AI processing
  const conversation = messages.map(msg => 
    `${msg.sender.name}: ${msg.content}`
  ).join('\n');

  // 3. Generate summary using GPT
  const prompt = `Analyze this support ticket conversation and provide:
    1. Main issue description
    2. Key investigation points
    3. Current status and next steps
    
    Conversation:
    ${conversation}`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  });

  // 4. Parse and structure the response
  return await Summary.create({
    taskId,
    content: response.choices[0].message.content,
    keyPoints: extractKeyPoints(response),
    entities: extractEntities(response)
  });
}
```

**QA Review System**:
- **Automated content analysis** for inappropriate content
- **Sentiment analysis** for escalation triggers
- **Technical accuracy validation** using domain-specific prompts
- **Compliance checking** for sensitive information

### 6. Authentication & Authorization

#### JWT-based Authentication (`src/middleware/auth.ts`)
```typescript
// Token structure
interface JWTPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

// Middleware implementation
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### Role-based Access Control
```typescript
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Usage in routes
router.delete('/tasks/:id', authenticate, requireAdmin, deleteTask);
```

### 7. Error Handling & Validation

#### Centralized Error Handling (`src/middleware/errorHandler.ts`)
```typescript
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error for monitoring
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.userId
  });

  // Send appropriate response
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      status: 'fail'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      status: 'error'
    });
  }
};
```

### 8. Database Optimization & Performance

#### Query Optimization Strategies
```sql
-- Indexes for common queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX idx_messages_task_id ON messages(task_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Composite indexes for complex filters
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_assignee_status ON tasks(assigned_to_id, status);
```

#### Pagination Implementation
```typescript
// Cursor-based pagination for consistent results
const getTasks = async (req: Request, res: Response) => {
  const { limit = 20, cursor, status, priority, assigneeId } = req.query;
  
  const whereClause: any = {};
  if (cursor) whereClause.id = { [Op.lt]: cursor };
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (assigneeId) whereClause.assignedToId = assigneeId;

  const tasks = await Task.findAll({
    where: whereClause,
    limit: Number(limit),
    order: [['id', 'DESC']],
    include: [
      { model: User, as: 'assignedTo' },
      { model: User, as: 'createdBy' }
    ]
  });

  res.json({
    tasks,
    nextCursor: tasks.length === Number(limit) ? tasks[tasks.length - 1].id : null,
    hasMore: tasks.length === Number(limit)
  });
};
```

## 🛡️ Security Implementation

### Input Validation & Sanitization
```typescript
// Request validation using express-validator
const createTaskValidation = [
  body('title').isLength({ min: 1, max: 255 }).trim().escape(),
  body('description').isLength({ min: 1, max: 10000 }).trim(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  body('assignedToId').optional().isInt({ min: 1 })
];
```

### Rate Limiting Strategy
```typescript
// Different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                     // 100 requests per window
  message: 'Too many requests'
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,     // 1 hour
  max: 20,                      // 20 uploads per hour
  message: 'Upload limit exceeded'
});

app.use('/api', generalLimiter);
app.use('/api/attachments', uploadLimiter);
```

### SQL Injection Prevention
- **Parameterized queries** using Sequelize ORM
- **Input validation** on all user inputs
- **Type checking** with TypeScript
- **Escape sequences** for dynamic query parts

## 🚀 Performance & Scalability

### Caching Strategy
```typescript
// Redis for session and frequently accessed data
const redisClient = redis.createClient();

// Cache frequently accessed tasks
const getCachedTask = async (taskId: number) => {
  const cached = await redisClient.get(`task:${taskId}`);
  if (cached) return JSON.parse(cached);
  
  const task = await Task.findByPk(taskId);
  await redisClient.setex(`task:${taskId}`, 300, JSON.stringify(task));
  return task;
};
```

### Database Connection Pooling
```typescript
// Sequelize connection pool configuration
const sequelize = new Sequelize(database, username, password, {
  host,
  dialect: 'postgres',
  pool: {
    max: 20,          // Maximum connections
    min: 0,           // Minimum connections
    acquire: 30000,   // Connection acquire timeout
    idle: 10000       // Connection idle timeout
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});
```

### Horizontal Scaling Considerations
- **Stateless design** - no server-side session storage
- **Database read replicas** for query scaling
- **Load balancer compatibility** with sticky sessions for WebSocket
- **Microservice extraction** potential for high-traffic components

## 🔧 Development & Deployment

### Environment Configuration
```typescript
// Type-safe environment variables
interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiration: string;
  };
  openai: {
    apiKey: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV as Config['nodeEnv'] || 'development',
  // ... rest of configuration
};
```

### Database Migrations
```typescript
// Example migration for adding indexes
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addIndex('tasks', ['status', 'priority'], {
      name: 'idx_tasks_status_priority'
    });
  },
  
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('tasks', 'idx_tasks_status_priority');
  }
};
```

### Testing Strategy
```typescript
// Integration tests for API endpoints
describe('Tasks API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  it('should create task with valid data', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium'
      });

    expect(response.status).toBe(201);
    expect(response.body.task.title).toBe('Test Task');
  });
});
```

## 📊 Monitoring & Observability

### Logging Strategy
```typescript
// Structured logging with context
const logger = {
  info: (message: string, meta: object = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  error: (message: string, error: Error, meta: object = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

### Health Checks
```typescript
// Comprehensive health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      openai: await checkOpenAIHealth()
    }
  };

  const hasFailures = Object.values(health.services).some(service => !service.healthy);
  const statusCode = hasFailures ? 503 : 200;
  
  res.status(statusCode).json(health);
});
```

## 🎯 Key Design Decisions

### Why PostgreSQL over NoSQL?
- **ACID compliance** for data consistency
- **Complex relationships** between tasks, messages, and users
- **Advanced indexing** for complex queries
- **JSON support** for flexible schema evolution

### Why Socket.IO over Native WebSockets?
- **Automatic reconnection** with exponential backoff
- **Room-based messaging** for scalability
- **Fallback to HTTP** for problematic network conditions
- **Built-in event acknowledgments** for reliability

### Why Sequelize ORM?
- **Type safety** with TypeScript integration
- **Migration system** for database evolution
- **Association handling** for complex relationships
- **Query optimization** with eager loading

## 🔮 Future Enhancements

### Planned Architecture Improvements
- **Microservice extraction** for AI services
- **Event sourcing** for audit trails and replay capability
- **CQRS pattern** for read/write optimization
- **GraphQL API** for flexible client queries
- **Message queues** (Redis/RabbitMQ) for async processing

### Scalability Roadmap
- **Database sharding** by organization/tenant
- **CDN integration** for file storage and delivery
- **Kubernetes deployment** with auto-scaling
- **Distributed caching** with Redis Cluster
- **Event-driven architecture** for loose coupling

### Security Enhancements
- **OAuth 2.0 integration** with enterprise SSO
- **API rate limiting** with distributed counters
- **Audit logging** for compliance requirements
- **Data encryption at rest** for sensitive information
- **Vulnerability scanning** in CI/CD pipeline

This backend provides a solid foundation for an enterprise-grade internal tool with room for growth and enhancement based on scaling requirements and user feedback.

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd faff-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=faff_db
   DB_USER=postgres
   DB_PASSWORD=postgres
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRATION=24h
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173
   
   # API Base URL (for file URLs)
   API_BASE_URL=http://localhost:3000
   ```

4. Create the PostgreSQL database:
   ```
   createdb faff_db
   ```

5. Start the development server:
   ```
   npm run dev
   ```

The server will start on the port specified in your `.env` file (default: 3000).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks` - Get all tasks with pagination and filtering
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task (admin only)

### Messages
- `POST /api/messages` - Create a new message (supports file uploads using multipart/form-data)
- `GET /api/messages/task/:taskId` - Get messages for a task
- `GET /api/messages/thread/:id` - Get message thread
- `PUT /api/messages/:id` - Update a message (supports adding more files)
- `DELETE /api/messages/:id` - Delete a message and its attachments
- `DELETE /api/messages/:id/attachment` - Remove a specific attachment from a message

### Summaries
- `POST /api/summaries` - Create or update a summary
- `GET /api/summaries/task/:taskId` - Get summary for a task
- `POST /api/summaries/generate/:taskId` - Generate a summary automatically

### QA Reviews
- `POST /api/qa` - Request a QA review
- `GET /api/qa` - Get all QA reviews
- `GET /api/qa/task/:taskId` - Get QA reviews for a task
- `PUT /api/qa/:id` - Update a QA review (approve/reject)

## File Uploads

For file uploads, use the following format:

```
POST /api/messages
Content-Type: multipart/form-data

taskId: 123
content: "Message text"
replyToId: 456 (optional)
files: [File1, File2, ...] (up to 5 files, max 10MB each)
```

Allowed file types include:
- Images (JPEG, PNG, GIF, WebP, SVG)
- Documents (PDF, Word, Excel, PowerPoint)
- Text files (TXT, CSV)
- Archives (ZIP, RAR)

Uploaded files are accessible at:
```
GET /uploads/messages/:filename
```

## WebSocket Events

### Client to Server
- `join_task` - Join a task room
- `send_message` - Send a message to a task
- `typing` - Send typing indicator
- `task_updated` - Notify about task updates
- `upload_progress` - Send file upload progress updates

### Server to Client
- `new_message` - New message in a task
- `user_typing` - User typing indicator
- `refresh_task` - Task data has been updated
- `file_upload_progress` - File upload progress updates
- `error` - Error message

## Development

### Build for production
```
npm run build
```

### Run in production
```
npm start
``` 