const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const targetDir = path.join(rootDir, 'تيك_سيستم');

console.log('Packaging Tech System portable bundle into:', targetDir);

// 1. Create target directories
const cashierFolder = path.join(targetDir, '1- تطبيق كاشير الصالون (POS)');
const adminFolder = path.join(targetDir, '2- تطبيق لوحة إدارة الصالون (ADMIN)');
const engineFolder = path.join(targetDir, 'engine');

fs.mkdirSync(cashierFolder, { recursive: true });
fs.mkdirSync(adminFolder, { recursive: true });
fs.mkdirSync(engineFolder, { recursive: true });

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

// 2. Copy EXEs
const cashierExe = path.join(rootDir, 'كاشير_صالون_عادل_POS.exe');
const adminExe = path.join(rootDir, 'إدارة_صالون_عادل_ADMIN.exe');

if (fs.existsSync(cashierExe)) {
  fs.copyFileSync(cashierExe, path.join(cashierFolder, 'كاشير_صالون_عادل_POS.exe'));
  fs.copyFileSync(cashierExe, path.join(targetDir, 'كاشير_صالون_عادل_POS.exe'));
}

if (fs.existsSync(adminExe)) {
  fs.copyFileSync(adminExe, path.join(adminFolder, 'إدارة_صالون_عادل_ADMIN.exe'));
  fs.copyFileSync(adminExe, path.join(targetDir, 'إدارة_صالون_عادل_ADMIN.exe'));
}

// 3. Copy apps into engine
console.log('Copying apps into engine...');
copyRecursive(path.join(rootDir, 'apps'), path.join(engineFolder, 'apps'));
copyRecursive(path.join(rootDir, 'node_modules'), path.join(engineFolder, 'node_modules'));
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(engineFolder, 'package.json'));
fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(engineFolder, 'package-lock.json'));
fs.copyFileSync(path.join(rootDir, '.env.example'), path.join(engineFolder, '.env.example'));

console.log('Self-contained Tech System packaging completed successfully!');
