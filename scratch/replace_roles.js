const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../components')
];

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      callback(filepath);
    }
  }
}

function processFile(filepath) {
  // Keep Super Admin files strictly limited to role === 'admin'
  if (filepath.includes('app/admin/page.js')) return;
  if (filepath.includes('components/AdminClient.js')) return;
  // Ignore the login page of sub-admin to avoid double replacements
  if (filepath.includes('app/sub-admin/login/page.js')) return;

  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // 1. Replace specific session.role checks first
  content = content.replace(/session\.role !== 'admin'/g, "(session.role !== 'admin' && session.role !== 'sub_admin')");
  content = content.replace(/session\.role === 'admin'/g, "(session.role === 'admin' || session.role === 'sub_admin')");

  // 2. Replace role variable checks (using lookbehind (?<![\w.]) to prevent matching properties like session.role, user.role, userRole, etc.)
  // We want to match exactly the standalone variable 'role'
  content = content.replace(/(?<![\w.])role !== 'admin'/g, "(role !== 'admin' && role !== 'sub_admin')");
  
  if (!filepath.includes('Navbar.js') && !filepath.includes('app/page.js')) {
    content = content.replace(/(?<![\w.])role === 'admin'/g, "(role === 'admin' || role === 'sub_admin')");
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Modified:', filepath);
  }
}

console.log('Starting search & replace for sub_admin authorization...');
for (const dir of targetDirs) {
  walk(dir, processFile);
}
console.log('Search & replace complete.');
