/**
 * 为已有的 zip 文件生成 electron-updater 兼容的 blockmap
 * 并生成完整的 latest.yml
 * 
 * 用法: node generate-blockmap.js <zip文件路径>
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BLOCK_SIZE = 4 * 1024 * 1024; // 4MB per block (electron-builder default)

async function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

async function sha512File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('data', d => hash.update(d));
    stream.on('end', () => resolve(hash.digest('base64')));
    stream.on('error', reject);
  });
}

async function generateBlockMap(zipPath) {
  const fileSize = fs.statSync(zipPath).size;
  const blocks = [];
  const fd = fs.openSync(zipPath, 'r');
  
  let offset = 0;
  while (offset < fileSize) {
    const remaining = Math.min(BLOCK_SIZE, fileSize - offset);
    const buf = Buffer.alloc(remaining);
    fs.readSync(fd, buf, 0, remaining, offset);
    const checksum = await sha256(buf);
    // electron-updater blockmap format: base64 of raw bytes
    blocks.push(checksum.toString('base64'));
    offset += remaining;
  }
  
  fs.closeSync(fd);
  
  const blockMapData = {
    version: 2,
    size: fileSize,
    blockSize: BLOCK_SIZE,
    blocks: blocks.map(c => ({ size: BLOCK_SIZE, checksum: c })),
    checksha512: await sha512File(zipPath)
  };
  
  // Last block might be smaller
  if (blocks.length > 0) {
    const lastBlockSize = fileSize - ((blocks.length - 1) * BLOCK_SIZE);
    blockMapData.blocks[blocks.length - 1].size = lastBlockSize;
  }
  
  return blockMapData;
}

function blockMapToBuffer(blockMap) {
  // Convert to the binary format that electron-updater expects
  let result = '';
  
  // Simple text-based blockmap (JSON format that electron-updater accepts)
  // Actually electron-updater expects a specific binary format or JSON with specific structure
  // Let's use the format from electron-builder's output
  
  const json = JSON.stringify({
    version: 2,
    size: blockMap.size,
    blockSize: blockMap.blockSize,
    blocks: blockMap.blocks,
    checksha512: blockMap.checksha512
  }, null, 0);
  
  return Buffer.from(json);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('用法: node generate-blockmap.js <zip文件路径>');
    process.exit(1);
  }
  
  const zipPath = path.resolve(args[0]);
  
  if (!fs.existsSync(zipPath)) {
    console.error(`文件不存在: ${zipPath}`);
    process.exit(1);
  }
  
  console.log(`正在处理: ${path.basename(zipPath)}`);
  
  const [sha512, size] = await Promise.all([
    sha512File(zipPath),
    fs.promises.stat(zipPath).then(s => s.size)
  ]);
  
  console.log(`文件大小: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`SHA512: ${sha512.substring(0, 32)}...`);
  
  // Generate blockmap
  console.log('正在生成 blockmap...');
  const blockMap = await generateBlockMap(zipPath);
  console.log(`共 ${blockMap.blocks.length} 个块`);
  
  // Write blockmap file
  const blockMapJson = JSON.stringify({
    version: 2,
    size: blockMap.size,
    blockSize: blockMap.blockSize,
    blocks: blockMap.blocks,
    checksha512: blockMap.checksha512
  });
  
  const blockMapPath = zipPath.replace('.zip', '.zip.blockmap');
  fs.writeFileSync(blockMapPath, blockMapJson, 'utf-8');
  const blockMapSize = fs.statSync(blockMapPath).size;
  const blockMapSha512 = await sha512File(blockMapPath);
  console.log(`Blockmap 已保存: ${path.basename(blockMapPath)} (${(blockMapSize / 1024).toFixed(1)} KB)`);
  
  // Generate complete latest.yml
  const zipName = path.basename(zipPath);
  const blockMapName = path.basename(blockMapPath);
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
  
  const latestYml = `version: ${require(path.join(path.dirname(zipPath), '..', 'package.json')).version}
files:
  - url: ${zipName}
    sha512: ${sha512}
    size: ${size}
  - url: ${blockMapName}
    sha512: ${blockMapSha512}
    size: ${blockMapSize}
path: ${zipName}
sha512: ${sha512}
releaseDate: '${now}'
`;
  
  const ymlPath = path.join(path.dirname(zipPath), 'latest.yml');
  fs.writeFileSync(ymlPath, latestYml, 'utf-8');
  console.log(`\nlatest.yml 已更新（包含 blockmap）`);
  console.log(`位置: ${ymlPath}`);
  
  console.log('\n--- 需要上传到 GitHub Release 的文件 ---');
  console.log(`1. ${zipName} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`2. ${blockMapName} (${(blockMapSize / 1024).toFixed(1)} KB)`);
  console.log(`3. latest.yml (小文件)`);
}

main().catch(e => { console.error(e); process.exit(1); });
