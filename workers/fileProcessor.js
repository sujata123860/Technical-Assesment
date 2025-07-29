const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Import models
const Agent = require('../models/Agent');
const User = require('../models/User');
const UserAccount = require('../models/UserAccount');
const PolicyCategory = require('../models/PolicyCategory');
const PolicyCarrier = require('../models/PolicyCarrier');
const Policy = require('../models/Policy');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/policy_management';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Worker connected to MongoDB');
  } catch (error) {
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Function to parse CSV file
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Function to parse XLSX file
function parseXLSX(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error(`Failed to parse XLSX file: ${error.message}`);
  }
}

// Function to process and insert data
async function processData(data) {
  const stats = {
    agents: 0,
    users: 0,
    userAccounts: 0,
    policyCategories: 0,
    policyCarriers: 0,
    policies: 0,
    errors: []
  };

  for (const row of data) {
    try {
      // Process Agent
      if (row.agent || row.agentName || row.agent_name || row['Agent Name']) {
        const agentName = row.agent || row.agentName || row.agent_name || row['Agent Name'];
        const existingAgent = await Agent.findOne({ agentName });
        if (!existingAgent) {
          await Agent.create({ agentName });
          stats.agents++;
        }
      }

      // Process User
      let userId = null;
      if (row.firstname || row.firstName || row.first_name || row['First Name']) {
        // Handle full name in firstname field
        const fullName = row.firstname || row.firstName || row.first_name || row['First Name'];
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || row.lastname || row.lastName || row.last_name || row['Last Name'] || '';
        
        const userData = {
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: new Date(row.dob || row.dateOfBirth || row['Date of Birth'] || '1990-01-01'),
          address: {
            street: row.address || row.street || row['Street Address'] || 'Unknown Street',
            city: row.city || row['City'] || 'Unknown City',
            state: row.state || row['State'] || 'Unknown State',
            zipCode: row.zip || row.zipCode || row.zip_code || row['Zip Code'] || '00000'
          },
          phoneNumber: row.phone || row.phoneNumber || row.phone_number || row['Phone Number'] || '',
          email: row.email || row['Email'] || `${firstName || 'user'}@example.com`,
          gender: row.gender || row['Gender'] || 'Other',
          userType: row.userType || row.user_type || row['User Type'] || 'Standard'
        };

        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          const newUser = await User.create(userData);
          userId = newUser._id;
          stats.users++;
        } else {
          userId = existingUser._id;
        }
      }

      // Process User Account
      if (userId && (row.account_name || row.accountName || row['Account Name'])) {
        const accountName = row.account_name || row.accountName || row['Account Name'];
        const existingAccount = await UserAccount.findOne({ accountName, userId });
        if (!existingAccount) {
          await UserAccount.create({ accountName, userId });
          stats.userAccounts++;
        }
      }

      // Process Policy Category
      let categoryId = null;
      if (row.category_name || row.categoryName || row['Category Name'] || row.lob || row['LOB']) {
        const categoryName = row.category_name || row.categoryName || row['Category Name'] || row.lob || row['LOB'];
        let category = await PolicyCategory.findOne({ categoryName });
        if (!category) {
          category = await PolicyCategory.create({ categoryName });
          stats.policyCategories++;
        }
        categoryId = category._id;
      }

      // Process Policy Carrier
      let companyId = null;
      if (row.company_name || row.companyName || row['Company Name'] || row.carrier || row['Carrier']) {
        const companyName = row.company_name || row.companyName || row['Company Name'] || row.carrier || row['Carrier'];
        let carrier = await PolicyCarrier.findOne({ companyName });
        if (!carrier) {
          carrier = await PolicyCarrier.create({ companyName });
          stats.policyCarriers++;
        }
        companyId = carrier._id;
      }

      // Process Policy
      if (userId && categoryId && companyId && (row.policy_number || row.policyNumber || row['Policy Number'])) {
        const policyData = {
          policyNumber: row.policy_number || row.policyNumber || row['Policy Number'],
          policyStartDate: new Date(row.policy_start_date || row.policyStartDate || row['Policy Start Date'] || Date.now()),
          policyEndDate: new Date(row.policy_end_date || row.policyEndDate || row['Policy End Date'] || Date.now() + 365*24*60*60*1000),
          categoryId,
          companyId,
          userId
        };

        const existingPolicy = await Policy.findOne({ policyNumber: policyData.policyNumber });
        if (!existingPolicy) {
          await Policy.create(policyData);
          stats.policies++;
        }
      }

    } catch (error) {
      stats.errors.push(`Row processing error: ${error.message}`);
    }
  }

  return stats;
}

// Main processing function
async function processFile() {
  try {
    await connectToDatabase();
    
    const { filePath, fileName } = workerData;
    const fileExtension = path.extname(fileName).toLowerCase();
    
    let data;
    
    if (fileExtension === '.csv') {
      data = await parseCSV(filePath);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      data = parseXLSX(filePath);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or XLSX files.');
    }
    
    if (!data || data.length === 0) {
      throw new Error('No data found in the uploaded file.');
    }
    
    const stats = await processData(data);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    // Close database connection
    await mongoose.connection.close();
    
    parentPort.postMessage({
      success: true,
      data: `Processed ${data.length} rows`,
      stats
    });
    
  } catch (error) {
    // Clean up uploaded file on error
    try {
      if (workerData.filePath && fs.existsSync(workerData.filePath)) {
        fs.unlinkSync(workerData.filePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }
    
    // Close database connection
    try {
      await mongoose.connection.close();
    } catch (dbError) {
      console.error('Error closing database connection:', dbError);
    }
    
    parentPort.postMessage({
      success: false,
      error: error.message
    });
  }
}

// Start processing
processFile();