const fs = require('fs');
const path = require('path');

const files = [
  'src/app/directory/DirectoryList.tsx',
  'src/app/pool/[id]/page.tsx',
  'src/app/profile/[id]/page.tsx',
  'src/app/ranking/page.tsx',
  'src/app/session/[id]/results/page.tsx',
  'src/app/session/[id]/page.tsx',
  'src/components/PlayerStatsChart.tsx',
  'src/components/PoolScoreForm.tsx'
];

for (const file of files) {
  const fullPath = path.resolve(file);
  console.log('Checking', fullPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/\.toFixed\(2\)(?!\.replace)/g, '.toFixed(2).replace(\'.\', \',\')');
    content = content.replace(/\.toFixed\(1\)(?!\.replace)/g, '.toFixed(1).replace(\'.\', \',\')');
    fs.writeFileSync(fullPath, content);
    console.log('Updated', fullPath);
  } else {
    console.log('Not found', fullPath);
  }
}
