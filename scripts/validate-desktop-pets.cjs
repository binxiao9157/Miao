#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const DEFAULT_ACTIONS = ['idle', 'tail', 'rubbing', 'blink'];
const root = path.resolve(
  process.argv[2] ||
  process.env.MIAO_DESKTOP_PETS_DIR ||
  path.join(__dirname, '..', 'public', 'desktop-pets', 'pets')
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasCommand(command) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function convertWebpToPng(webpPath) {
  if (!hasCommand('sips')) return '';
  const pngPath = path.join(os.tmpdir(), `miao-desktop-pet-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
  execFileSync('sips', ['-s', 'format', 'png', webpPath, '--out', pngPath], { stdio: 'ignore' });
  return pngPath;
}

function parsePng(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('Not a PNG image');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.slice(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === 'IDAT') idats.push(data);
    offset += length + 12;
  }

  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported PNG color type: ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let inputOffset = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset++];
    const previous = y ? pixels.slice((y - 1) * stride, y * stride) : null;
    const output = pixels.slice(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? output[x - channels] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= channels ? previous[x - channels] : 0;
      let value = raw[inputOffset++];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (value + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`);
      output[x] = value;
    }
  }

  return { width, height, channels, pixels };
}

function collectVisibleFrames(image, manifest) {
  const columns = manifest.columns || 8;
  const rows = manifest.rows || 9;
  const frameWidth = manifest.frameWidth || Math.floor(image.width / columns);
  const frameHeight = manifest.frameHeight || Math.floor(image.height / rows);
  const visible = new Set();

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let visibleSamples = 0;
      for (let y = row * frameHeight; y < (row + 1) * frameHeight; y += 2) {
        for (let x = column * frameWidth; x < (column + 1) * frameWidth; x += 2) {
          const index = (y * image.width + x) * image.channels;
          const opaque = image.channels === 4
            ? image.pixels[index + 3] > 10
            : Boolean(image.pixels[index] || image.pixels[index + 1] || image.pixels[index + 2]);
          if (opaque) visibleSamples += 1;
        }
      }
      if (visibleSamples > 20) visible.add(row * columns + column);
    }
  }

  return visible;
}

function validatePet(folder) {
  const errors = [];
  const manifestPath = path.join(folder, 'pet.json');
  if (!fs.existsSync(manifestPath)) return [`${folder}: missing pet.json`];
  const manifest = readJson(manifestPath);
  const id = manifest.id || path.basename(folder);
  const spritesheetPath = path.join(folder, manifest.spritesheetPath || '');
  if (!manifest.spritesheetPath) errors.push(`${id}: missing spritesheetPath`);
  if (!fs.existsSync(spritesheetPath)) errors.push(`${id}: missing spritesheet ${manifest.spritesheetPath}`);

  const columns = manifest.columns || 8;
  const rows = manifest.rows || 9;
  const frameWidth = manifest.frameWidth || 192;
  const frameHeight = manifest.frameHeight || 208;
  const frameCount = columns * rows;

  let visibleFrames = null;
  if (fs.existsSync(spritesheetPath)) {
    try {
      const pngPath = convertWebpToPng(spritesheetPath);
      if (pngPath) {
        const image = parsePng(pngPath);
        fs.rmSync(pngPath, { force: true });
        if (image.width !== columns * frameWidth || image.height !== rows * frameHeight) {
          errors.push(`${id}: spritesheet size ${image.width}x${image.height} does not match ${columns}x${rows} * ${frameWidth}x${frameHeight}`);
        }
        visibleFrames = collectVisibleFrames(image, { columns, rows, frameWidth, frameHeight });
      }
    } catch (error) {
      errors.push(`${id}: cannot inspect spritesheet visibility (${error.message})`);
    }
  }

  for (const action of DEFAULT_ACTIONS) {
    const animation = manifest.animations?.[action];
    if (!animation?.frames?.length) {
      errors.push(`${id}: missing animation ${action}`);
      continue;
    }
    for (const frame of animation.frames) {
      if (!Number.isInteger(frame) || frame < 0 || frame >= frameCount) {
        errors.push(`${id}: ${action} frame ${frame} is out of range 0-${frameCount - 1}`);
      } else if (visibleFrames && !visibleFrames.has(frame)) {
        errors.push(`${id}: ${action} frame ${frame} is transparent/empty`);
      }
    }
  }

  return errors;
}

if (!fs.existsSync(root)) {
  console.error(`[desktop-pet] asset root not found: ${root}`);
  process.exit(1);
}

const petFolders = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, entry.name));

const errors = petFolders.flatMap(validatePet);
if (errors.length) {
  console.error(`[desktop-pet] ${errors.length} issue(s) found:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[desktop-pet] ${petFolders.length} pet manifest(s) validated in ${root}`);
