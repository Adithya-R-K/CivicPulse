const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('./models/User');
const Complaint = require('./models/Complaint');
const Department = require('./models/Department');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      family: 4,
    });
    console.log('Connected to MongoDB Atlas for seeding...');

    // Clear existing collections
    await User.deleteMany();
    await Complaint.deleteMany();
    await Department.deleteMany();

    // Create Departments
    const departments = await Department.create([
      { name: 'Roads & Transportation', email: 'roads@city.gov', phone: '555-1001', slaHours: 48 },
      { name: 'Water & Sewage', email: 'water@city.gov', phone: '555-1002', slaHours: 24 },
      { name: 'Electricity Department', email: 'power@city.gov', phone: '555-1003', slaHours: 12 },
      { name: 'Waste Management', email: 'waste@city.gov', phone: '555-1004', slaHours: 72 },
      { name: 'Parks & Recreation', email: 'parks@city.gov', phone: '555-1005', slaHours: 120 },
      { name: 'Public Safety', email: 'safety@city.gov', phone: '555-1006', slaHours: 6 },
      { name: 'Building & Construction', email: 'building@city.gov', phone: '555-1007', slaHours: 96 },
    ]);

    // Create Admin User
    const admin = await User.create({
      username: 'admin',
      email: 'admin@civicpulse.gov',
      password: 'Admin123',
      fullName: 'System Administrator',
      role: 'admin',
      isAdmin: true,
      phone: '9876543210',
      address: 'Municipal Corporation Headquarters',
    });

    // Create Citizen User
    const citizen = await User.create({
      username: 'citizen',
      email: 'citizen@civicpulse.gov',
      password: 'Citizen123',
      fullName: 'Adithya Citizen',
      role: 'citizen',
      isAdmin: false,
      phone: '9876500000',
      address: 'Gandhipuram, Coimbatore',
    });

    console.log('Users and departments created.');

    // Seed Complaints
    const complaintsData = [
      {
        author: citizen._id,
        title: 'Deep pothole on Avinashi Road',
        description: 'Large potholes on the Avinashi Road near Peelamedu causing severe vehicle damage and traffic jams.',
        category: 'Roads',
        location: 'Avinashi Road near Peelamedu',
        coordinates: { latitude: 11.0280, longitude: 77.0043 },
        priority: 'High',
        status: 'Submitted',
        department: 'Roads & Transportation',
      },
      {
        author: citizen._id,
        title: 'Drinking water pipeline burst near Gandhipuram',
        description: 'Large municipal pipeline burst beside Gandhipuram bus terminus. Clean water is wasting rapidly.',
        category: 'Water',
        location: 'Gandhipuram Bus Stand',
        coordinates: { latitude: 11.0205, longitude: 76.9667 },
        priority: 'Urgent',
        status: 'In Progress',
        department: 'Water & Sewage',
      },
      {
        author: citizen._id,
        title: 'Open electrical junction box in Saibaba Colony',
        description: 'Open electrical wiring box hanging close to pedestrian footpath. Major shock hazard for school children.',
        category: 'Electricity',
        location: 'Saibaba Colony 5th Cross',
        coordinates: { latitude: 11.0236, longitude: 76.9440 },
        priority: 'Urgent',
        status: 'In Review',
        department: 'Electricity Department',
      },
      {
        author: citizen._id,
        title: 'Garbage accumulation along Singanallur Lake road',
        description: 'Community garbage bin has overflowed for 4 days. Strong odor and stray animal menace.',
        category: 'Waste',
        location: 'Singanallur Lake Road',
        coordinates: { latitude: 11.0000, longitude: 77.0268 },
        priority: 'Medium',
        status: 'Resolved',
        resolvedAt: new Date(),
        department: 'Waste Management',
      },
      {
        author: citizen._id,
        title: 'Broken children swings at VOC Park',
        description: 'Playground swings and slide chains snapped and broken. Needs immediate repair before weekend.',
        category: 'Parks',
        location: 'VOC Park & Grounds',
        coordinates: { latitude: 11.0122, longitude: 76.9502 },
        priority: 'Low',
        status: 'Resolved',
        resolvedAt: new Date(),
        department: 'Parks & Recreation',
      },
      {
        author: citizen._id,
        title: 'Streetlights non-functional in Ukkadam',
        description: 'Entire row of 8 streetlights dark from Ukkadam junction to bypass. Pitch black at night.',
        category: 'Safety',
        location: 'Ukkadam Junction',
        coordinates: { latitude: 10.9946, longitude: 76.9580 },
        priority: 'High',
        status: 'In Progress',
        department: 'Public Safety',
      },
    ];

    await Complaint.create(complaintsData);

    console.log('✅ Seed completed successfully with initial data!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
