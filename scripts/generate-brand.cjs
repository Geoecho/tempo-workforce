const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.TEMPO_SHARP_MODULE || 'sharp');

const root = path.resolve(__dirname, '..');
const mark = (color) => `<g fill="${color}" transform="rotate(-22 20 20)"><rect x="8" y="12" width="6" height="16" rx="3"/><rect x="17" y="6" width="6" height="28" rx="3"/><rect x="26" y="9.5" width="6" height="21" rx="3"/></g>`;
const icon = (color, background, scale = 600, radius = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" rx="${radius}" fill="${background}"/>` : ''}<svg x="${(1024 - scale) / 2}" y="${(1024 - scale) / 2}" width="${scale}" height="${scale}" viewBox="0 0 40 40">${mark(color)}</svg></svg>`;
const png = async (source, file, size, opaque = false) => {
  let image = sharp(Buffer.from(source)).resize(size, size);
  if (opaque) image = image.removeAlpha();
  return image.png().toFile(path.join(root, file));
};

async function main() {
  const app = icon('#F8F9F5', '#254E3D', 680);
  const adaptive = icon('#F8F9F5', null, 540);
  for (const file of ['assets/tempo-icon.png', 'assets/icon.png', 'brand/app-icon.png']) await png(app, file, 1024, true);
  for (const file of ['assets/tempo-adaptive-icon.png', 'assets/android-icon-foreground.png']) await png(adaptive, file, 1024);
  await png(icon('#FFFFFF', null, 540), 'assets/android-icon-monochrome.png', 1024);
  await png(icon('#FFFFFF', null, 880), 'assets/notification-icon.png', 96);
  await png(icon('#254E3D', null, 680), 'assets/splash-icon.png', 1024);
  await png(icon('#F8F9F5', '#254E3D', 730, 220), 'assets/favicon.png', 512);
  await png(icon('#254E3D', '#254E3D', 0), 'assets/android-icon-background.png', 1024, true);
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  await png(app, 'public/apple-touch-icon.png', 180, true);
  await png(app, 'public/icon-192.png', 192, true);
  await png(app, 'public/icon-512.png', 512, true);
  fs.writeFileSync(path.join(root, 'brand/tempo-mark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${mark('#254E3D')}</svg>\n`);
  fs.writeFileSync(path.join(root, 'brand/tempo-logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="110" viewBox="0 0 420 110" role="img" aria-label="Tempo"><svg x="6" y="14" width="82" height="82" viewBox="0 0 40 40">${mark('#202C27')}</svg><text x="107" y="80" font-family="Arial,Helvetica,sans-serif" font-size="77" font-weight="600" letter-spacing="-4" fill="#202C27">tempo</text></svg>\n`);
  for (const [name, height] of [['feed', 1350], ['story', 1920]]) {
    const offset = height === 1920 ? 230 : 0;
    const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#18392C"/><g font-family="Arial,Helvetica,sans-serif"><svg x="75" y="90" width="80" height="80" viewBox="0 0 40 40">${mark('#F8F9F5')}</svg><text x="175" y="150" font-size="67" letter-spacing="-3" fill="#F8F9F5">tempo</text><text x="88" y="${350 + offset}" font-size="21" fill="#ACBDA2">People. Time. In sync.</text><text x="80" y="${505 + offset}" font-size="126" letter-spacing="-7" fill="#F8F9F5">Every shift,</text><text x="80" y="${645 + offset}" font-size="126" letter-spacing="-7" fill="#9BB18E">in sync.</text><text x="88" y="${748 + offset}" font-size="30" fill="#BACAB0">One simple place for teams, time &amp; pay.</text><rect x="88" y="${843 + offset}" width="904" height="205" rx="15" fill="#F8F9F5"/><text x="120" y="${890 + offset}" font-size="19" fill="#819076">Your next shift</text><text x="120" y="${946 + offset}" font-size="37" letter-spacing="-1" fill="#254E3D">Stage crew</text><text x="120" y="${997 + offset}" font-size="22" fill="#819076">Northline Festival</text><text x="790" y="${946 + offset}" font-size="23" fill="#254E3D">08:00–18:00</text><path d="M88 ${height - 180}h904" stroke="#47614B"/><text x="88" y="${height - 115}" font-size="24" fill="#B8CBAF">A better rhythm for work.</text><text x="920" y="${height - 110}" font-size="42" fill="#B8CBAF">↗</text></g></svg>`;
    fs.writeFileSync(path.join(root, `brand/instagram-${name}.svg`), social);
    await sharp(Buffer.from(social)).png().toFile(path.join(root, `brand/instagram-${name}.png`));
  }
  console.log('Generated Tempo brand assets.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
