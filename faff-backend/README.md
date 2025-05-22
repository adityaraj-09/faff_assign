# Faff Internal Ticketing & Chat System Backend

This is the backend for Faff, an internal ticketing interface with threaded chat and task management. The system allows operations teams to view and manage tasks, participate in group chats, and generate AI-powered summaries of discussions.

## Features

- **Task Management**: Create, update, and filter tasks with different statuses
- **Real-time Chat**: Threaded group chat for each task with WebSocket support
- **File Attachments**: Upload and manage files within messages
- **AI-powered Summaries**: Automatically generate concise summaries of discussions with entity extraction
- **Quality Assurance**: AI-powered QA review system for message content
- **User Authentication**: Secure JWT-based authentication
- **Scalability**: Rate limiting, file size restrictions, and optimized database queries

## Tech Stack

- Node.js
- Express
- TypeScript
- PostgreSQL
- Sequelize ORM
- Socket.IO for real-time communication
- OpenAI API for summarization and QA
- Multer for file uploads

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

## Scalability Considerations

- **Rate Limiting**: API-wide rate limiting and specific limits for file uploads
- **File Validation**: Size and type validation for all uploads
- **Error Handling**: Comprehensive error handling and resource cleanup
- **Database Optimization**: Proper indexing and query optimization
- **Stateless Design**: JWT authentication for horizontal scaling

## Development

### Build for production
```
npm run build
```

### Run in production
```
npm start
```

## Future Improvements

- Cloud storage integration (AWS S3, Google Cloud Storage)
- Enhanced AI-based summarization with custom training
- Push notifications
- Integration with external services (Slack, Email)
- Advanced analytics and reporting 