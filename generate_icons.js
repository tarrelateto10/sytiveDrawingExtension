const fs = require('fs');
const path = require('path');

const iconSizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// 1x1 pixel transparent PNG base64
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(base64Png, 'base64');

iconSizes.forEach(size => {
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
    console.log(`Created icon${size}.png`);
});
