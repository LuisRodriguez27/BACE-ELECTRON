const fs = require('fs');
let content = fs.readFileSync('/home/luis/Projects/BACE-ELECTRON/electron/db.js', 'utf8');
content = content.replace(/active INTEGER NOT NULL DEFAULT 1/g, 'active BOOLEAN NOT NULL DEFAULT TRUE');
fs.writeFileSync('/home/luis/Projects/BACE-ELECTRON/electron/db.js', content);
