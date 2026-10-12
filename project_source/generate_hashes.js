
const bcrypt = require('bcryptjs');

async function generateHashes() {
    const adminPass = await bcrypt.hash('admin123', 10);
    const parentPass = await bcrypt.hash('parent123', 10);
    
    console.log('Admin password hash:', adminPass);
    console.log('Parent password hash:', parentPass);
}

generateHashes();
