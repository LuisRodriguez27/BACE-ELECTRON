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
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Types: active: number -> active: boolean
  content = content.replace(/active(\??):\s*number/g, 'active$1: boolean');
  // Optional active number in type interfaces: active?: number -> active?: boolean
  
  // Logic: active === 1 -> active === true (or just active)
  content = content.replace(/active\s*===\s*1/g, 'active === true');
  content = content.replace(/active\s*!==\s*1/g, 'active !== true');
  
  // Logic: active === 0 -> active === false
  content = content.replace(/active\s*===\s*0/g, 'active === false');
  content = content.replace(/active\s*!==\s*0/g, 'active !== false');
  
  // db migrations / inserts: active: 1 -> active: true
  // specifically in auth/types.ts: user.active === 1 -> user.active === true
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

walkDir('/home/luis/Projects/BACE-ELECTRON/renderer/src', processFile);
walkDir('/home/luis/Projects/BACE-ELECTRON/electron/services', processFile);
