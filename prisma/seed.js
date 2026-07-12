const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Checking if database needs seeding...');
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('✨ Database already has data. Skipping seeder.');
    return;
  }

  console.log('🌱 Seeding AssetFlow database...');

  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.auditAssignment.deleteMany();
  await prisma.auditCycle.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // ============================================================
  // DEPARTMENTS
  // ============================================================
  const itDept = await prisma.department.create({
    data: { name: 'Information Technology', code: 'IT', description: 'IT Infrastructure & Software Development', status: 'ACTIVE' },
  });
  const hrDept = await prisma.department.create({
    data: { name: 'Human Resources', code: 'HR', description: 'People Operations & Talent Management', status: 'ACTIVE' },
  });
  const financeDept = await prisma.department.create({
    data: { name: 'Finance & Accounting', code: 'FIN', description: 'Financial Planning & Analysis', status: 'ACTIVE' },
  });
  const marketingDept = await prisma.department.create({
    data: { name: 'Marketing', code: 'MKT', description: 'Brand Management & Digital Marketing', status: 'ACTIVE' },
  });
  const operationsDept = await prisma.department.create({
    data: { name: 'Operations', code: 'OPS', description: 'Supply Chain & Operations Management', status: 'ACTIVE' },
  });
  const salesDept = await prisma.department.create({
    data: { name: 'Sales', code: 'SLS', description: 'Business Development & Sales', status: 'ACTIVE' },
  });
  const rdDept = await prisma.department.create({
    data: { name: 'Research & Development', code: 'RND', description: 'Product Innovation & Research', status: 'ACTIVE' },
  });
  const adminDept = await prisma.department.create({
    data: { name: 'Administration', code: 'ADM', description: 'General Administration & Facilities', status: 'ACTIVE' },
  });

  // Sub-departments
  const devTeam = await prisma.department.create({
    data: { name: 'Software Development', code: 'IT-DEV', description: 'Application Development Team', parentId: itDept.id, status: 'ACTIVE' },
  });
  const infraTeam = await prisma.department.create({
    data: { name: 'Infrastructure', code: 'IT-INFRA', description: 'Network & Server Infrastructure', parentId: itDept.id, status: 'ACTIVE' },
  });

  // ============================================================
  // USERS
  // ============================================================
  const admin = await prisma.user.create({
    data: {
      email: 'admin@assetflow.com', passwordHash, name: 'Rajesh Kumar',
      role: 'ADMIN', departmentId: adminDept.id, phone: '+91 98765 43210',
    },
  });
  const assetManager = await prisma.user.create({
    data: {
      email: 'manager@assetflow.com', passwordHash, name: 'Priya Sharma',
      role: 'ASSET_MANAGER', departmentId: itDept.id, phone: '+91 98765 43211',
    },
  });
  const itHead = await prisma.user.create({
    data: {
      email: 'ithead@assetflow.com', passwordHash, name: 'Vikram Patel',
      role: 'DEPARTMENT_HEAD', departmentId: itDept.id, phone: '+91 98765 43212',
    },
  });
  const hrHead = await prisma.user.create({
    data: {
      email: 'hrhead@assetflow.com', passwordHash, name: 'Anita Desai',
      role: 'DEPARTMENT_HEAD', departmentId: hrDept.id, phone: '+91 98765 43213',
    },
  });
  const finHead = await prisma.user.create({
    data: {
      email: 'finhead@assetflow.com', passwordHash, name: 'Suresh Menon',
      role: 'DEPARTMENT_HEAD', departmentId: financeDept.id, phone: '+91 98765 43214',
    },
  });

  // Employees
  const emp1 = await prisma.user.create({
    data: {
      email: 'rahul@assetflow.com', passwordHash, name: 'Rahul Singh',
      role: 'EMPLOYEE', departmentId: itDept.id, phone: '+91 98765 43215',
    },
  });
  const emp2 = await prisma.user.create({
    data: {
      email: 'neha@assetflow.com', passwordHash, name: 'Neha Gupta',
      role: 'EMPLOYEE', departmentId: itDept.id, phone: '+91 98765 43216',
    },
  });
  const emp3 = await prisma.user.create({
    data: {
      email: 'amit@assetflow.com', passwordHash, name: 'Amit Joshi',
      role: 'EMPLOYEE', departmentId: hrDept.id, phone: '+91 98765 43217',
    },
  });
  const emp4 = await prisma.user.create({
    data: {
      email: 'kavita@assetflow.com', passwordHash, name: 'Kavita Reddy',
      role: 'EMPLOYEE', departmentId: financeDept.id, phone: '+91 98765 43218',
    },
  });
  const emp5 = await prisma.user.create({
    data: {
      email: 'deepak@assetflow.com', passwordHash, name: 'Deepak Nair',
      role: 'EMPLOYEE', departmentId: marketingDept.id, phone: '+91 98765 43219',
    },
  });
  const emp6 = await prisma.user.create({
    data: {
      email: 'sunita@assetflow.com', passwordHash, name: 'Sunita Iyer',
      role: 'EMPLOYEE', departmentId: operationsDept.id, phone: '+91 98765 43220',
    },
  });
  const emp7 = await prisma.user.create({
    data: {
      email: 'arjun@assetflow.com', passwordHash, name: 'Arjun Mehta',
      role: 'EMPLOYEE', departmentId: salesDept.id, phone: '+91 98765 43221',
    },
  });
  const emp8 = await prisma.user.create({
    data: {
      email: 'meera@assetflow.com', passwordHash, name: 'Meera Krishnan',
      role: 'EMPLOYEE', departmentId: rdDept.id, phone: '+91 98765 43222',
    },
  });

  // Update department heads
  await prisma.department.update({ where: { id: itDept.id }, data: { headId: itHead.id } });
  await prisma.department.update({ where: { id: hrDept.id }, data: { headId: hrHead.id } });
  await prisma.department.update({ where: { id: financeDept.id }, data: { headId: finHead.id } });

  // ============================================================
  // ASSET CATEGORIES
  // ============================================================
  const electronicsCategory = await prisma.assetCategory.create({
    data: {
      name: 'Electronics', description: 'Laptops, desktops, monitors, and electronic devices',
      icon: 'Monitor', customFields: JSON.stringify([
        { name: 'warrantyPeriod', label: 'Warranty Period (months)', type: 'number' },
        { name: 'processor', label: 'Processor', type: 'text' },
        { name: 'ram', label: 'RAM (GB)', type: 'number' },
      ]),
    },
  });
  const furnitureCategory = await prisma.assetCategory.create({
    data: {
      name: 'Furniture', description: 'Desks, chairs, cabinets, and office furniture',
      icon: 'Armchair', customFields: JSON.stringify([
        { name: 'material', label: 'Material', type: 'text' },
        { name: 'color', label: 'Color', type: 'text' },
      ]),
    },
  });
  const vehiclesCategory = await prisma.assetCategory.create({
    data: {
      name: 'Vehicles', description: 'Company cars, vans, and transport vehicles',
      icon: 'Car', customFields: JSON.stringify([
        { name: 'registrationNumber', label: 'Registration Number', type: 'text' },
        { name: 'fuelType', label: 'Fuel Type', type: 'text' },
        { name: 'mileage', label: 'Current Mileage (km)', type: 'number' },
      ]),
    },
  });
  const meetingRoomsCategory = await prisma.assetCategory.create({
    data: {
      name: 'Meeting Rooms', description: 'Conference rooms and meeting spaces',
      icon: 'DoorOpen', customFields: JSON.stringify([
        { name: 'capacity', label: 'Seating Capacity', type: 'number' },
        { name: 'hasProjector', label: 'Has Projector', type: 'boolean' },
        { name: 'hasVideoConf', label: 'Has Video Conferencing', type: 'boolean' },
      ]),
    },
  });
  const equipmentCategory = await prisma.assetCategory.create({
    data: {
      name: 'Equipment', description: 'Projectors, printers, scanners, and shared equipment',
      icon: 'Projector', customFields: JSON.stringify([
        { name: 'powerConsumption', label: 'Power Consumption (W)', type: 'number' },
      ]),
    },
  });
  const networkingCategory = await prisma.assetCategory.create({
    data: {
      name: 'Networking', description: 'Routers, switches, access points, and networking equipment',
      icon: 'Wifi',
    },
  });

  // ============================================================
  // ASSETS
  // ============================================================
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Electronics
  const laptop1 = await prisma.asset.create({
    data: {
      name: 'MacBook Pro 16"', assetTag: 'AF-0001', categoryId: electronicsCategory.id,
      serialNumber: 'MBP-2024-001', acquisitionDate: sixMonthsAgo, acquisitionCost: 249999,
      condition: 'GOOD', location: 'IT Lab - Floor 3', status: 'ALLOCATED',
      departmentId: itDept.id, assignedToId: emp1.id, registeredById: assetManager.id,
      notes: 'M3 Pro, 36GB RAM, 512GB SSD',
    },
  });
  const laptop2 = await prisma.asset.create({
    data: {
      name: 'Dell XPS 15', assetTag: 'AF-0002', categoryId: electronicsCategory.id,
      serialNumber: 'DXPS-2024-002', acquisitionDate: sixMonthsAgo, acquisitionCost: 189999,
      condition: 'GOOD', location: 'IT Lab - Floor 3', status: 'ALLOCATED',
      departmentId: itDept.id, assignedToId: emp2.id, registeredById: assetManager.id,
      notes: 'Intel i9, 32GB RAM, 1TB SSD',
    },
  });
  const laptop3 = await prisma.asset.create({
    data: {
      name: 'ThinkPad X1 Carbon', assetTag: 'AF-0003', categoryId: electronicsCategory.id,
      serialNumber: 'TP-2024-003', acquisitionDate: threeMonthsAgo, acquisitionCost: 159999,
      condition: 'NEW', location: 'HR Department - Floor 2', status: 'ALLOCATED',
      departmentId: hrDept.id, assignedToId: emp3.id, registeredById: assetManager.id,
    },
  });
  const laptop4 = await prisma.asset.create({
    data: {
      name: 'HP EliteBook 840', assetTag: 'AF-0004', categoryId: electronicsCategory.id,
      serialNumber: 'HP-2024-004', acquisitionDate: threeMonthsAgo, acquisitionCost: 129999,
      condition: 'GOOD', location: 'Finance - Floor 2', status: 'AVAILABLE',
      departmentId: financeDept.id, registeredById: assetManager.id,
    },
  });
  const monitor1 = await prisma.asset.create({
    data: {
      name: 'LG UltraWide 34"', assetTag: 'AF-0005', categoryId: electronicsCategory.id,
      serialNumber: 'LG-2024-005', acquisitionDate: oneYearAgo, acquisitionCost: 54999,
      condition: 'GOOD', location: 'IT Lab - Floor 3', status: 'ALLOCATED',
      departmentId: itDept.id, assignedToId: emp1.id, registeredById: assetManager.id,
    },
  });
  const monitor2 = await prisma.asset.create({
    data: {
      name: 'Dell UltraSharp 27"', assetTag: 'AF-0006', categoryId: electronicsCategory.id,
      serialNumber: 'DU-2024-006', acquisitionDate: oneYearAgo, acquisitionCost: 44999,
      condition: 'FAIR', location: 'Marketing - Floor 1', status: 'AVAILABLE',
      departmentId: marketingDept.id, registeredById: assetManager.id,
    },
  });
  const desktop1 = await prisma.asset.create({
    data: {
      name: 'iMac 27" 5K', assetTag: 'AF-0007', categoryId: electronicsCategory.id,
      serialNumber: 'IMAC-2024-007', acquisitionDate: sixMonthsAgo, acquisitionCost: 199999,
      condition: 'GOOD', location: 'Design Studio - Floor 1', status: 'ALLOCATED',
      departmentId: marketingDept.id, assignedToId: emp5.id, registeredById: assetManager.id,
    },
  });

  // Furniture
  const desk1 = await prisma.asset.create({
    data: {
      name: 'Standing Desk - Motorized', assetTag: 'AF-0008', categoryId: furnitureCategory.id,
      serialNumber: 'SD-2024-008', acquisitionDate: oneYearAgo, acquisitionCost: 45999,
      condition: 'GOOD', location: 'IT Lab - Floor 3', status: 'ALLOCATED',
      departmentId: itDept.id, assignedToId: emp1.id, registeredById: assetManager.id,
    },
  });
  const chair1 = await prisma.asset.create({
    data: {
      name: 'Herman Miller Aeron Chair', assetTag: 'AF-0009', categoryId: furnitureCategory.id,
      serialNumber: 'HM-2024-009', acquisitionDate: oneYearAgo, acquisitionCost: 89999,
      condition: 'GOOD', location: 'Executive Suite - Floor 4', status: 'AVAILABLE',
      registeredById: assetManager.id,
    },
  });

  // Vehicles
  const vehicle1 = await prisma.asset.create({
    data: {
      name: 'Toyota Innova Crysta', assetTag: 'AF-0010', categoryId: vehiclesCategory.id,
      serialNumber: 'TIC-2024-010', acquisitionDate: oneYearAgo, acquisitionCost: 2199999,
      condition: 'GOOD', location: 'Parking Lot - B1', status: 'AVAILABLE',
      isShared: true, isBookable: true, registeredById: assetManager.id,
    },
  });
  const vehicle2 = await prisma.asset.create({
    data: {
      name: 'Maruti Swift Dzire', assetTag: 'AF-0011', categoryId: vehiclesCategory.id,
      serialNumber: 'MSD-2024-011', acquisitionDate: sixMonthsAgo, acquisitionCost: 899999,
      condition: 'NEW', location: 'Parking Lot - B1', status: 'AVAILABLE',
      isShared: true, isBookable: true, registeredById: assetManager.id,
    },
  });

  // Meeting Rooms
  const room1 = await prisma.asset.create({
    data: {
      name: 'Conference Room Alpha', assetTag: 'AF-0012', categoryId: meetingRoomsCategory.id,
      serialNumber: 'CR-ALPHA-001', acquisitionDate: oneYearAgo, acquisitionCost: 500000,
      condition: 'GOOD', location: 'Floor 3 - East Wing', status: 'AVAILABLE',
      isShared: true, isBookable: true, registeredById: assetManager.id,
      notes: 'Capacity: 20, Projector, Video Conferencing',
    },
  });
  const room2 = await prisma.asset.create({
    data: {
      name: 'Meeting Room Beta', assetTag: 'AF-0013', categoryId: meetingRoomsCategory.id,
      serialNumber: 'MR-BETA-002', acquisitionDate: oneYearAgo, acquisitionCost: 300000,
      condition: 'GOOD', location: 'Floor 2 - West Wing', status: 'AVAILABLE',
      isShared: true, isBookable: true, registeredById: assetManager.id,
      notes: 'Capacity: 10, Whiteboard, Display Screen',
    },
  });
  const room3 = await prisma.asset.create({
    data: {
      name: 'Huddle Space Gamma', assetTag: 'AF-0014', categoryId: meetingRoomsCategory.id,
      serialNumber: 'HS-GAMMA-003', acquisitionDate: sixMonthsAgo, acquisitionCost: 150000,
      condition: 'NEW', location: 'Floor 1 - Lobby Area', status: 'AVAILABLE',
      isShared: true, isBookable: true, registeredById: assetManager.id,
      notes: 'Capacity: 4, Informal seating',
    },
  });

  // Equipment
  const projector1 = await prisma.asset.create({
    data: {
      name: 'Epson Projector EB-X51', assetTag: 'AF-0015', categoryId: equipmentCategory.id,
      serialNumber: 'EP-2024-015', acquisitionDate: sixMonthsAgo, acquisitionCost: 65999,
      condition: 'GOOD', location: 'AV Room - Floor 2', status: 'AVAILABLE',
      isShared: true, isBookable: true, registeredById: assetManager.id,
    },
  });
  const printer1 = await prisma.asset.create({
    data: {
      name: 'HP LaserJet Pro MFP', assetTag: 'AF-0016', categoryId: equipmentCategory.id,
      serialNumber: 'HLP-2024-016', acquisitionDate: oneYearAgo, acquisitionCost: 35999,
      condition: 'FAIR', location: 'Print Station - Floor 2', status: 'UNDER_MAINTENANCE',
      isShared: true, registeredById: assetManager.id,
    },
  });

  // A few more assets for volume
  const laptop5 = await prisma.asset.create({
    data: {
      name: 'MacBook Air M2', assetTag: 'AF-0017', categoryId: electronicsCategory.id,
      serialNumber: 'MBA-2024-017', acquisitionDate: threeMonthsAgo, acquisitionCost: 114999,
      condition: 'NEW', location: 'Sales - Floor 1', status: 'ALLOCATED',
      departmentId: salesDept.id, assignedToId: emp7.id, registeredById: assetManager.id,
    },
  });
  const laptop6 = await prisma.asset.create({
    data: {
      name: 'Lenovo IdeaPad', assetTag: 'AF-0018', categoryId: electronicsCategory.id,
      serialNumber: 'LIP-2024-018', acquisitionDate: threeMonthsAgo, acquisitionCost: 69999,
      condition: 'NEW', location: 'Operations - Floor 1', status: 'AVAILABLE',
      departmentId: operationsDept.id, registeredById: assetManager.id,
    },
  });
  const retiredLaptop = await prisma.asset.create({
    data: {
      name: 'Dell Latitude E7470', assetTag: 'AF-0019', categoryId: electronicsCategory.id,
      serialNumber: 'DLE-2022-019', acquisitionDate: new Date('2022-01-15'), acquisitionCost: 89999,
      condition: 'POOR', location: 'Storage Room - Basement', status: 'RETIRED',
      registeredById: assetManager.id, notes: 'Battery no longer holds charge. Retired from active use.',
    },
  });
  const lostTablet = await prisma.asset.create({
    data: {
      name: 'iPad Pro 12.9"', assetTag: 'AF-0020', categoryId: electronicsCategory.id,
      serialNumber: 'IPP-2023-020', acquisitionDate: new Date('2023-06-15'), acquisitionCost: 109999,
      condition: 'GOOD', location: 'Unknown', status: 'LOST',
      registeredById: assetManager.id, notes: 'Reported missing during Q4 2024 audit.',
    },
  });

  // ============================================================
  // ALLOCATIONS
  // ============================================================
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const overdueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  await prisma.allocation.create({
    data: {
      assetId: laptop1.id, allocatedToId: emp1.id, allocatedById: assetManager.id,
      departmentId: itDept.id, allocatedAt: sixMonthsAgo, expectedReturnDate: inTwoWeeks,
      status: 'ACTIVE',
    },
  });
  await prisma.allocation.create({
    data: {
      assetId: laptop2.id, allocatedToId: emp2.id, allocatedById: assetManager.id,
      departmentId: itDept.id, allocatedAt: sixMonthsAgo, expectedReturnDate: overdueDate,
      status: 'OVERDUE',
    },
  });
  await prisma.allocation.create({
    data: {
      assetId: laptop3.id, allocatedToId: emp3.id, allocatedById: assetManager.id,
      departmentId: hrDept.id, allocatedAt: threeMonthsAgo, expectedReturnDate: inTwoWeeks,
      status: 'ACTIVE',
    },
  });
  await prisma.allocation.create({
    data: {
      assetId: monitor1.id, allocatedToId: emp1.id, allocatedById: assetManager.id,
      departmentId: itDept.id, allocatedAt: oneYearAgo,
      status: 'ACTIVE',
    },
  });
  await prisma.allocation.create({
    data: {
      assetId: desktop1.id, allocatedToId: emp5.id, allocatedById: assetManager.id,
      departmentId: marketingDept.id, allocatedAt: sixMonthsAgo,
      status: 'ACTIVE',
    },
  });
  await prisma.allocation.create({
    data: {
      assetId: desk1.id, allocatedToId: emp1.id, allocatedById: assetManager.id,
      departmentId: itDept.id, allocatedAt: oneYearAgo,
      status: 'ACTIVE',
    },
  });
  await prisma.allocation.create({
    data: {
      assetId: laptop5.id, allocatedToId: emp7.id, allocatedById: assetManager.id,
      departmentId: salesDept.id, allocatedAt: threeMonthsAgo, expectedReturnDate: inTwoWeeks,
      status: 'ACTIVE',
    },
  });

  // A returned allocation for history
  await prisma.allocation.create({
    data: {
      assetId: laptop4.id, allocatedToId: emp4.id, allocatedById: assetManager.id,
      departmentId: financeDept.id, allocatedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      expectedReturnDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      returnedAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      returnNotes: 'Returned in good condition', conditionOnReturn: 'GOOD',
      status: 'RETURNED',
    },
  });

  // ============================================================
  // TRANSFERS
  // ============================================================
  await prisma.transfer.create({
    data: {
      assetId: laptop2.id, fromUserId: emp2.id, toUserId: emp5.id,
      fromDeptId: itDept.id, toDeptId: marketingDept.id,
      requestedById: emp5.id, status: 'REQUESTED',
      reason: 'Need a more powerful laptop for video editing tasks',
    },
  });

  // ============================================================
  // BOOKINGS
  // ============================================================
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(10, 0, 0, 0);

  const tomorrowAfternoon = new Date(tomorrow);
  tomorrowAfternoon.setHours(14, 0, 0, 0);
  const tomorrowAfternoonEnd = new Date(tomorrow);
  tomorrowAfternoonEnd.setHours(16, 0, 0, 0);

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(10, 0, 0, 0);
  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(11, 30, 0, 0);

  await prisma.booking.create({
    data: {
      assetId: room1.id, bookedById: itHead.id,
      startTime: tomorrow, endTime: tomorrowEnd,
      purpose: 'Sprint Planning Meeting', status: 'UPCOMING',
    },
  });
  await prisma.booking.create({
    data: {
      assetId: room1.id, bookedById: hrHead.id,
      startTime: tomorrowAfternoon, endTime: tomorrowAfternoonEnd,
      purpose: 'New Employee Orientation', status: 'UPCOMING',
    },
  });
  await prisma.booking.create({
    data: {
      assetId: room2.id, bookedById: emp1.id,
      startTime: dayAfter, endTime: dayAfterEnd,
      purpose: 'Code Review Session', status: 'UPCOMING',
    },
  });
  await prisma.booking.create({
    data: {
      assetId: vehicle1.id, bookedById: emp7.id,
      startTime: tomorrow, endTime: tomorrowAfternoonEnd,
      purpose: 'Client visit to Bangalore office', status: 'UPCOMING',
    },
  });
  await prisma.booking.create({
    data: {
      assetId: projector1.id, bookedById: emp5.id,
      startTime: tomorrowAfternoon, endTime: tomorrowAfternoonEnd,
      purpose: 'Marketing Presentation', status: 'UPCOMING',
    },
  });

  // Past booking (completed)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(11, 0, 0, 0);

  await prisma.booking.create({
    data: {
      assetId: room2.id, bookedById: finHead.id,
      startTime: yesterday, endTime: yesterdayEnd,
      purpose: 'Budget Review Q2', status: 'COMPLETED',
    },
  });

  // ============================================================
  // MAINTENANCE REQUESTS
  // ============================================================
  await prisma.maintenanceRequest.create({
    data: {
      assetId: printer1.id, requestedById: emp3.id,
      description: 'Paper jam issue - printer frequently jams when printing duplex',
      priority: 'HIGH', issueType: 'Hardware Malfunction',
      status: 'IN_PROGRESS', approvedById: assetManager.id,
      assignedToId: emp6.id,
    },
  });
  await prisma.maintenanceRequest.create({
    data: {
      assetId: laptop1.id, requestedById: emp1.id,
      description: 'Battery draining faster than usual, only lasts 3 hours',
      priority: 'MEDIUM', issueType: 'Battery Issue',
      status: 'PENDING',
    },
  });
  await prisma.maintenanceRequest.create({
    data: {
      assetId: monitor2.id, requestedById: emp5.id,
      description: 'Screen flickering intermittently at high brightness',
      priority: 'LOW', issueType: 'Display Issue',
      status: 'APPROVED', approvedById: assetManager.id,
    },
  });

  // ============================================================
  // AUDIT CYCLES
  // ============================================================
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const auditCycle = await prisma.auditCycle.create({
    data: {
      name: 'Q2 2025 IT Asset Audit', scope: 'DEPARTMENT',
      departmentId: itDept.id, startDate: lastMonth, endDate: now,
      status: 'IN_PROGRESS', createdById: admin.id,
    },
  });

  await prisma.auditAssignment.create({
    data: { auditCycleId: auditCycle.id, auditorId: assetManager.id },
  });

  // Audit items for the cycle
  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id, assetId: laptop1.id,
      auditorId: assetManager.id, verificationStatus: 'VERIFIED',
      verifiedAt: twoDaysAgo,
    },
  });
  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id, assetId: laptop2.id,
      auditorId: assetManager.id, verificationStatus: 'VERIFIED',
      verifiedAt: twoDaysAgo,
    },
  });
  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id, assetId: monitor1.id,
      auditorId: assetManager.id, verificationStatus: 'DAMAGED',
      notes: 'Minor scratch on screen bezel', verifiedAt: twoDaysAgo,
    },
  });

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  await prisma.notification.createMany({
    data: [
      {
        userId: emp1.id, title: 'Asset Assigned',
        message: 'MacBook Pro 16" (AF-0001) has been assigned to you.',
        type: 'ASSET_ASSIGNED', referenceId: laptop1.id, referenceType: 'ASSET',
      },
      {
        userId: emp2.id, title: 'Overdue Return Alert',
        message: 'Dell XPS 15 (AF-0002) return is overdue. Please return or request an extension.',
        type: 'OVERDUE_RETURN', referenceId: laptop2.id, referenceType: 'ASSET',
      },
      {
        userId: assetManager.id, title: 'Transfer Request',
        message: 'Deepak Nair requested transfer of Dell XPS 15 (AF-0002) from IT to Marketing.',
        type: 'TRANSFER_APPROVED', referenceType: 'TRANSFER',
      },
      {
        userId: itHead.id, title: 'Booking Confirmed',
        message: 'Conference Room Alpha booked for tomorrow 9:00-10:00 AM.',
        type: 'BOOKING_CONFIRMED', referenceId: room1.id, referenceType: 'BOOKING',
      },
      {
        userId: emp3.id, title: 'Maintenance Update',
        message: 'Your maintenance request for HP LaserJet Pro MFP is now In Progress.',
        type: 'MAINTENANCE_APPROVED', referenceId: printer1.id, referenceType: 'MAINTENANCE',
      },
      {
        userId: assetManager.id, title: 'Audit Assigned',
        message: 'You have been assigned as auditor for Q2 2025 IT Asset Audit.',
        type: 'AUDIT_ASSIGNED', referenceId: auditCycle.id, referenceType: 'AUDIT',
      },
      {
        userId: admin.id, title: 'Discrepancy Detected',
        message: 'Monitor LG UltraWide (AF-0005) reported as damaged during Q2 audit.',
        type: 'DISCREPANCY_DETECTED', referenceId: monitor1.id, referenceType: 'ASSET',
      },
    ],
  });

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================
  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id, action: 'Created department', entityType: 'DEPARTMENT',
        entityId: itDept.id, role: 'ADMIN',
        newValue: JSON.stringify({ name: 'Information Technology', code: 'IT' }),
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        userId: assetManager.id, action: 'Registered asset', entityType: 'ASSET',
        entityId: laptop1.id, role: 'ASSET_MANAGER',
        newValue: JSON.stringify({ name: 'MacBook Pro 16"', assetTag: 'AF-0001' }),
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        userId: assetManager.id, action: 'Allocated asset', entityType: 'ALLOCATION',
        entityId: laptop1.id, role: 'ASSET_MANAGER',
        newValue: JSON.stringify({ asset: 'AF-0001', allocatedTo: 'Rahul Singh' }),
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: emp1.id, action: 'Raised maintenance request', entityType: 'MAINTENANCE',
        role: 'EMPLOYEE',
        newValue: JSON.stringify({ asset: 'AF-0001', issue: 'Battery draining fast' }),
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: itHead.id, action: 'Booked resource', entityType: 'BOOKING',
        entityId: room1.id, role: 'DEPARTMENT_HEAD',
        newValue: JSON.stringify({ resource: 'Conference Room Alpha', date: 'Tomorrow 9:00 AM' }),
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        userId: admin.id, action: 'Promoted employee', entityType: 'USER',
        entityId: itHead.id, role: 'ADMIN',
        previousValue: JSON.stringify({ role: 'EMPLOYEE' }),
        newValue: JSON.stringify({ role: 'DEPARTMENT_HEAD' }),
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        userId: assetManager.id, action: 'Started audit cycle', entityType: 'AUDIT',
        entityId: auditCycle.id, role: 'ASSET_MANAGER',
        newValue: JSON.stringify({ name: 'Q2 2025 IT Asset Audit', scope: 'IT Department' }),
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('  Admin:           admin@assetflow.com / password123');
  console.log('  Asset Manager:   manager@assetflow.com / password123');
  console.log('  IT Dept Head:    ithead@assetflow.com / password123');
  console.log('  HR Dept Head:    hrhead@assetflow.com / password123');
  console.log('  Employee:        rahul@assetflow.com / password123');
  console.log('');
  console.log(`📊 Created: 10 departments, 13 users, 6 categories, 20 assets, 8 allocations, 1 transfer, 6 bookings, 3 maintenance requests, 1 audit cycle`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
