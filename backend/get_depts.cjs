const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: String,
  status: Boolean,
});
const Department = mongoose.model('Department', departmentSchema);

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/it_consultant_crm';
  await mongoose.connect(uri);
  const depts = await Department.find({});
  console.log(JSON.stringify(depts, null, 2));
  process.exit(0);
}
run().catch(console.error);
