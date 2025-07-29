const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const cron = require('node-cron');
const pidusage = require('pidusage');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/policy_management';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Import models
const Agent = require('./models/Agent');
const User = require('./models/User');
const UserAccount = require('./models/UserAccount');
const PolicyCategory = require('./models/PolicyCategory');
const PolicyCarrier = require('./models/PolicyCarrier');
const Policy = require('./models/Policy');
const ScheduledMessage = require('./models/ScheduledMessage');

// MongoDB connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// CPU monitoring function with file processing protection
let isProcessingFile = false;
function monitorCPU() {
  setInterval(async () => {
    try {
      const stats = await pidusage(process.pid);
      const cpuUsage = stats.cpu;
      
      console.log(`Current CPU usage: ${cpuUsage.toFixed(2)}%`);
      
      // Don't restart during file processing
      if (cpuUsage > 70 && !isProcessingFile) {
        console.log('CPU usage exceeded 70%. Restarting server...');
        process.exit(1); // Exit with error code to trigger restart
      } else if (cpuUsage > 70 && isProcessingFile) {
        console.log('High CPU usage detected during file processing - monitoring...');
      }
    } catch (error) {
      console.error('Error monitoring CPU:', error);
    }
  }, 5000); // Check every 5 seconds
}

// Start CPU monitoring
monitorCPU();

// API Routes

// Root route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Task 1.1: Upload XLSX/CSV data using worker threads
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Set file processing flag to prevent auto-restart during upload
  isProcessingFile = true;

  const worker = new Worker('./workers/fileProcessor.js', {
    workerData: {
      filePath: req.file.path,
      fileName: req.file.originalname
    }
  });

  worker.on('message', (result) => {
    isProcessingFile = false; // Reset flag when processing completes
    if (result.success) {
      res.json({ 
        message: 'File processed successfully', 
        data: result.data,
        stats: result.stats
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  });

  worker.on('error', (error) => {
    isProcessingFile = false; // Reset flag on error
    res.status(500).json({ error: error.message });
  });
});

// Task 1.2: Search API to find policy info by username
app.get('/api/policies/search/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find user by first name (assuming username is first name)
    const user = await User.findOne({ 
      firstName: { $regex: username, $options: 'i' } 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find policies for this user
    const policies = await Policy.find({ userId: user._id })
      .populate('categoryId', 'categoryName')
      .populate('companyId', 'companyName')
      .populate('userId', 'firstName lastName email');
    
    res.json({
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      policies: policies
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task 1.3: API to provide aggregated policy by each user
app.get('/api/policies/aggregated', async (req, res) => {
  try {
    const aggregatedPolicies = await Policy.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'policycategories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'policycarriers',
          localField: 'companyId',
          foreignField: '_id',
          as: 'carrier'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $unwind: '$category'
      },
      {
        $unwind: '$carrier'
      },
      {
        $group: {
          _id: '$userId',
          userName: { $first: { $concat: ['$user.firstName', ' ', '$user.lastName'] } },
          userEmail: { $first: '$user.email' },
          totalPolicies: { $sum: 1 },
          policies: {
            $push: {
              policyNumber: '$policyNumber',
              startDate: '$policyStartDate',
              endDate: '$policyEndDate',
              category: '$category.categoryName',
              carrier: '$carrier.companyName'
            }
          },
          categories: { $addToSet: '$category.categoryName' },
          carriers: { $addToSet: '$carrier.companyName' }
        }
      },
      {
        $sort: { totalPolicies: -1 }
      }
    ]);
    
    res.json(aggregatedPolicies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task 2.2: Post service for scheduled messages
app.post('/api/schedule-message', async (req, res) => {
  try {
    const { message, day, time } = req.body;
    
    if (!message || !day || !time) {
      return res.status(400).json({ 
        error: 'Message, day, and time are required' 
      });
    }
    
    // Parse the day and time to create a Date object
    const scheduledDate = new Date(`${day} ${time}`);
    
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ 
        error: 'Scheduled time must be in the future' 
      });
    }
    
    const scheduledMessage = new ScheduledMessage({
      message,
      scheduledDate,
      status: 'pending'
    });
    
    await scheduledMessage.save();
    
    // Schedule the message insertion
    scheduleMessageInsertion(scheduledMessage);
    
    res.json({ 
      message: 'Message scheduled successfully',
      scheduledMessage 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Function to schedule message insertion
function scheduleMessageInsertion(scheduledMessage) {
  const now = new Date();
  const scheduledTime = new Date(scheduledMessage.scheduledDate);
  const delay = scheduledTime.getTime() - now.getTime();
  
  if (delay > 0) {
    setTimeout(async () => {
      try {
        await ScheduledMessage.findByIdAndUpdate(
          scheduledMessage._id,
          { 
            status: 'completed',
            insertedAt: new Date()
          }
        );
        console.log(`Message inserted: ${scheduledMessage.message}`);
      } catch (error) {
        console.error('Error inserting scheduled message:', error);
      }
    }, delay);
  }
}

// Load and schedule existing pending messages on server start
async function loadPendingMessages() {
  try {
    const pendingMessages = await ScheduledMessage.find({ status: 'pending' });
    pendingMessages.forEach(message => {
      scheduleMessageInsertion(message);
    });
    console.log(`Loaded ${pendingMessages.length} pending messages`);
  } catch (error) {
    console.error('Error loading pending messages:', error);
  }
}

// Additional API endpoints for CRUD operations
app.get('/api/agents', async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/policies', async (req, res) => {
  try {
    const policies = await Policy.find()
      .populate('categoryId')
      .populate('companyId')
      .populate('userId');
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Load pending messages on startup
  await loadPendingMessages();
  
  console.log('Policy Management System is ready!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});