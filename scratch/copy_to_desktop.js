const fs = require('fs');
const path = require('path');
const os = require('os');

const desktopPath = path.join(os.homedir(), 'Desktop');
const srcDir = path.join(__dirname, '..', 'تيك_سيستم');
const destDir = path.join(desktopPath, 'تيك سيستم');

console.log('Source:', srcDir);
console.log('Destination on Desktop:', destDir);

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(srcDir, destDir);
console.log('Successfully placed [تيك سيستم] on Windows Desktop!');
