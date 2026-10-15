const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function testApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne({ role: 'Admin' });
  
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  const axios = require('axios');
  const res = await axios.get(`http://localhost:5005/api/drs/${user.company}?view=today-tomorrow`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('DRS today-tomorrow response status:', res.status, 'Count:', res.data.length);
  await mongoose.disconnect();
}
testApi();
