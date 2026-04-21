const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace SQL active = 1 -> active = true
  content = content.replace(/active\s*=\s*1/g, 'active = true');
  
  // Replace SQL active = 0 -> active = false
  content = content.replace(/active\s*=\s*0/g, 'active = false');
  
  // Replace object assigns active: 1 -> active: true
  content = content.replace(/active:\s*1/g, 'active: true');
  content = content.replace(/active:\s*0/g, 'active: false');

  // Any other remaining == 1 or === 1 in logic inside repositories
  content = content.replace(/active\s*===\s*1/g, 'active === true');
  content = content.replace(/active\s*!==\s*1/g, 'active !== true');
  content = content.replace(/active\s*===\s*0/g, 'active === false');
  content = content.replace(/active\s*!==\s*0/g, 'active !== false');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

walkDir('/home/luis/Projects/BACE-ELECTRON/electron/repositories', processFile);
