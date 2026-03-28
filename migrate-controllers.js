const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'backend', 'src', 'controllers');

fs.readdirSync(controllersDir).forEach(file => {
  if (file === 'authController.js') return;
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove USER_ID declaration
  content = content.replace(/const USER_ID\s*=\s*['"]default-user-id['"];?\n?/g, '');
  
  // 2. Remove default user creation blocks
  const userCreationRegex = /let user\s*=\s*await prisma\.user\.findUnique[^}]*?data:\s*\{\s*id:\s*USER_ID,\s*name:\s*'Default User'\s*\}[^}]*\}[^}]*\};?/g;
  content = content.replace(userCreationRegex, '');

  // 3. Replace direct usages
  content = content.replace(/userId:\s*USER_ID/g, 'familyId: req.user.familyId');
  
  // 4. Replace inequality checks
  content = content.replace(/\buserId\s*!==\s*USER_ID/g, 'familyId !== req.user.familyId');

  // 5. Replace unique constraint names
  content = content.replace(/userId_name/g, 'familyId_name');
  content = content.replace(/userId_code/g, 'familyId_code');
  content = content.replace(/userId_categoryId_month_year/g, 'familyId_categoryId_month_year');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Migrated:', file);
});
