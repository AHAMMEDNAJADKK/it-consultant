import mongoose from 'mongoose';
import User from './src/models/user.model.js';

const run = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/it_consultant_crm';
    await mongoose.connect(uri);
    const athira = await User.findById('6a51c83ce41c02ca222bec4d');
    console.log(athira);
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
};
run();
