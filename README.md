<<<<<<< HEAD
# Technical-Assesment
=======
# Policy Management System

A comprehensive Node.js application for managing insurance policies with MongoDB integration, file upload capabilities, real-time CPU monitoring, and scheduled message insertion.

## Features

### Task 1: Policy Management APIs
1. **File Upload API** - Upload XLSX/CSV data using worker threads
2. **Policy Search API** - Find policy information by username
3. **Aggregated Policy API** - Get aggregated policy data by user
4. **Separate MongoDB Collections** - Agent, User, UserAccount, PolicyCategory, PolicyCarrier, Policy

### Task 2: Server Monitoring & Scheduling
1. **Real-time CPU Monitoring** - Automatic server restart at 70% CPU usage
2. **Scheduled Message Service** - Insert messages at specified date and time

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/policy_management
   PORT=3000
   CPU_THRESHOLD=70
   ```

4. Start MongoDB service

5. Run the application:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

## API Endpoints

### File Upload
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (XLSX or CSV)
```

**Expected CSV/XLSX columns:**
- Agent: `agentName` or `agent_name` or `Agent Name`
- User: `firstName`, `lastName`, `dateOfBirth`, `address`, `city`, `state`, `zipCode`, `phoneNumber`, `email`, `gender`, `userType`
- Account: `accountName`
- Category: `categoryName` or `lob`
- Carrier: `companyName` or `carrier`
- Policy: `policyNumber`, `policyStartDate`, `policyEndDate`

### Policy Search
```
GET /api/policies/search/:username
```
Find policies by username (searches firstName field)

### Aggregated Policies
```
GET /api/policies/aggregated
```
Get aggregated policy data grouped by user

### Scheduled Messages
```
POST /api/schedule-message
Content-Type: application/json

Body:
{
  "message": "Your message here",
  "day": "2024-12-25",
  "time": "10:30:00"
}
```

### Additional Endpoints
```
GET /api/agents          # Get all agents
GET /api/users           # Get all users
GET /api/policies        # Get all policies
GET /api/health          # Health check
```

## Database Schema

### Collections

1. **agents**
   - `agentName`: String (required)

2. **users**
   - `firstName`: String (required)
   - `lastName`: String (required)
   - `dateOfBirth`: Date (required)
   - `address`: Object with street, city, state, zipCode
   - `phoneNumber`: String (required)
   - `email`: String (required, unique)
   - `gender`: String (enum: Male, Female, Other)
   - `userType`: String (required)

3. **useraccounts**
   - `accountName`: String (required)
   - `userId`: ObjectId (ref: User)

4. **policycategories**
   - `categoryName`: String (required, unique)

5. **policycarriers**
   - `companyName`: String (required, unique)

6. **policies**
   - `policyNumber`: String (required, unique)
   - `policyStartDate`: Date (required)
   - `policyEndDate`: Date (required)
   - `categoryId`: ObjectId (ref: PolicyCategory)
   - `companyId`: ObjectId (ref: PolicyCarrier)
   - `userId`: ObjectId (ref: User)

7. **scheduledmessages**
   - `message`: String (required)
   - `scheduledDate`: Date (required)
   - `status`: String (enum: pending, completed, failed)
   - `insertedAt`: Date

## CPU Monitoring

The application continuously monitors CPU usage every 5 seconds. When CPU usage exceeds 70%, the server automatically restarts to maintain performance.

## Worker Threads

File processing is handled by worker threads to prevent blocking the main thread during large file uploads. The worker:
- Parses CSV and XLSX files
- Validates and processes data
- Inserts data into appropriate MongoDB collections
- Provides detailed statistics on processed records

## Error Handling

- Comprehensive error handling for file uploads
- Database connection error handling
- Graceful shutdown on SIGTERM
- Detailed error messages in API responses

## Sample Data Format

### CSV Example
```csv
agentName,firstName,lastName,email,accountName,categoryName,companyName,policyNumber,policyStartDate,policyEndDate
John Agent,Alice,Smith,alice@example.com,Alice Account,Auto,ABC Insurance,POL001,2024-01-01,2024-12-31
```

### XLSX Example
Same columns as CSV but in Excel format.

## Development

### Project Structure
```
├── models/              # MongoDB schemas
├── workers/             # Worker thread files
├── uploads/             # Temporary file storage
├── server.js           # Main application file
├── package.json        # Dependencies
├── .env               # Environment variables
└── README.md          # Documentation
```

### Testing

1. Start the server: `npm start`
2. Test health endpoint: `GET http://localhost:3000/api/health`
3. Upload a sample CSV/XLSX file
4. Search for policies by username
5. View aggregated policy data
6. Schedule a test message

## Production Considerations

1. Use PM2 or similar process manager for automatic restarts
2. Configure proper MongoDB replica sets
3. Implement rate limiting
4. Add authentication and authorization
5. Use HTTPS in production
6. Configure proper logging
7. Set up monitoring and alerting

## Troubleshooting

- Ensure MongoDB is running before starting the application
- Check file permissions for the uploads directory
- Verify environment variables are properly set
- Monitor server logs for detailed error information

## License

MIT License
>>>>>>> 47bb065 (Policy Management System Project)
