import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Usage: node render_auth_notes_pdf.mjs input.md output.pdf');
}

const source = fs.readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 54;
const RIGHT = 54;
const TOP = 777;
const BOTTOM = 55;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;

const colors = {
  navy: [0.075, 0.16, 0.28],
  blue: [0.075, 0.36, 0.58],
  cyan: [0.08, 0.62, 0.67],
  dark: [0.11, 0.13, 0.16],
  body: [0.18, 0.20, 0.23],
  muted: [0.40, 0.44, 0.49],
  light: [0.93, 0.95, 0.97],
  line: [0.80, 0.84, 0.88],
  white: [1, 1, 1],
  code: [0.10, 0.12, 0.15],
  callout: [0.91, 0.97, 0.98],
};

const pages = [];
let page = null;
let y = TOP;
let isCover = false;

function ascii(value) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u2193/g, 'v')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ')
    .normalize('NFKD')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?');
}

function pdfEscape(value) {
  return ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function rgb(color) {
  return color.map((part) => part.toFixed(3)).join(' ');
}

function addOperation(operation) {
  page.operations.push(operation);
}

function addText(text, x, baseline, size, font = 'F1', color = colors.body) {
  if (!text) return;
  addOperation(
    `BT /${font} ${size.toFixed(2)} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET`,
  );
}

function addLine(x1, y1, x2, y2, width, color) {
  addOperation(
    `${rgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
  );
}

function addRect(x, bottom, width, height, fill, stroke = null, strokeWidth = 0.5) {
  let operation = '';
  if (fill) operation += `${rgb(fill)} rg `;
  if (stroke) operation += `${rgb(stroke)} RG ${strokeWidth.toFixed(2)} w `;
  operation += `${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re `;
  operation += fill && stroke ? 'B' : fill ? 'f' : 'S';
  addOperation(operation);
}

function newPage({ cover = false } = {}) {
  page = { operations: [], cover };
  pages.push(page);
  isCover = cover;
  y = TOP;

  if (!cover) {
    addText('BACKEND SECURITY NOTES', LEFT, 810, 7.6, 'F2', colors.blue);
    addText('Authentication / Sessions / JWT', 388, 810, 7.6, 'F1', colors.muted);
    addLine(LEFT, 800, PAGE_WIDTH - RIGHT, 800, 0.65, colors.line);
  }
}

function ensureSpace(height) {
  if (y - height < BOTTOM) {
    newPage();
  }
}

function characterWidth(character, size, font) {
  if (font === 'F3') return size * 0.60;
  if (character === ' ') return size * 0.28;
  if ('ilI.,:;!|\'`'.includes(character)) return size * 0.25;
  if ('mwMW@%&'.includes(character)) return size * 0.80;
  if (/[A-Z0-9]/.test(character)) return size * 0.59;
  return size * 0.49;
}

function textWidth(text, size, font = 'F1') {
  return [...text].reduce((total, character) => total + characterWidth(character, size, font), 0);
}

function splitLongWord(word, maxWidth, size, font) {
  const chunks = [];
  let chunk = '';
  for (const character of word) {
    if (chunk && textWidth(chunk + character, size, font) > maxWidth) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk += character;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function wrapText(text, maxWidth, size, font = 'F1') {
  const rawWords = ascii(text).trim().split(/\s+/).filter(Boolean);
  const words = [];

  for (const word of rawWords) {
    if (textWidth(word, size, font) > maxWidth) {
      words.push(...splitLongWord(word, maxWidth, size, font));
    } else {
      words.push(word);
    }
  }

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate, size, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function cleanInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
}

function renderParagraph(text, options = {}) {
  const {
    x = LEFT,
    width = CONTENT_WIDTH,
    size = 9.45,
    lineHeight = 13.1,
    font = 'F1',
    color = colors.body,
    before = 2,
    after = 7,
  } = options;

  const lines = wrapText(cleanInline(text), width, size, font);
  ensureSpace(before + lines.length * lineHeight + after);
  y -= before;
  for (const line of lines) {
    addText(line, x, y, size, font, color);
    y -= lineHeight;
  }
  y -= after;
}

function renderBullet(text, marker = '-') {
  const size = 9.25;
  const lineHeight = 12.8;
  const markerWidth = 18;
  const lines = wrapText(cleanInline(text), CONTENT_WIDTH - markerWidth, size, 'F1');
  ensureSpace(lines.length * lineHeight + 4);
  addText(marker, LEFT + 2, y, size, 'F2', colors.blue);
  lines.forEach((line, index) => {
    addText(line, LEFT + markerWidth, y - index * lineHeight, size, 'F1', colors.body);
  });
  y -= lines.length * lineHeight + 3;
}

function renderHeading(level, text) {
  text = cleanInline(text);

  if (level === 2) {
    ensureSpace(48);
    y -= y === TOP ? 2 : 13;
    addRect(LEFT, y - 4, 4, 21, colors.cyan);
    addText(text, LEFT + 14, y, 16.2, 'F2', colors.navy);
    y -= 15;
    addLine(LEFT + 14, y, PAGE_WIDTH - RIGHT, y, 0.55, colors.line);
    y -= 17;
    return;
  }

  ensureSpace(32);
  y -= 7;
  addText(text, LEFT, y, 11.8, 'F2', colors.blue);
  y -= 18;
}

function renderCode(lines) {
  const size = 7.8;
  const lineHeight = 10.4;
  const x = LEFT + 9;
  const width = CONTENT_WIDTH - 18;
  const renderedLines = [];

  for (const rawLine of lines) {
    const line = ascii(rawLine).replace(/\t/g, '    ');
    if (!line) {
      renderedLines.push('');
      continue;
    }
    renderedLines.push(...wrapText(line, width - 14, size, 'F3'));
  }

  let index = 0;
  while (index < renderedLines.length) {
    const availableLines = Math.max(1, Math.floor((y - BOTTOM - 27) / lineHeight));
    if (availableLines < 2) {
      newPage();
      continue;
    }

    const chunk = renderedLines.slice(index, index + availableLines);
    const height = chunk.length * lineHeight + 18;
    ensureSpace(height + 5);
    addRect(LEFT, y - height + 5, CONTENT_WIDTH, height, colors.light, colors.line, 0.45);
    addRect(LEFT, y - height + 5, 3.5, height, colors.blue);
    let codeY = y - 8;
    for (const line of chunk) {
      addText(line, x + 4, codeY, size, 'F3', colors.code);
      codeY -= lineHeight;
    }
    y -= height + 8;
    index += chunk.length;
  }
}

function renderCallout(text) {
  const size = 9.3;
  const lineHeight = 13;
  const lines = wrapText(cleanInline(text), CONTENT_WIDTH - 34, size, 'F1');
  const height = lines.length * lineHeight + 18;
  ensureSpace(height + 5);
  addRect(LEFT, y - height + 6, CONTENT_WIDTH, height, colors.callout, colors.cyan, 0.55);
  addText('KEY IDEA', LEFT + 11, y - 8, 7.2, 'F2', colors.blue);
  let lineY = y - 23;
  for (const line of lines) {
    addText(line, LEFT + 11, lineY, size, 'F1', colors.dark);
    lineY -= lineHeight;
  }
  y -= height + 8;
}

function renderCover(title, subtitleLines) {
  newPage({ cover: true });
  addRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, colors.navy);
  addRect(0, 0, 15, PAGE_HEIGHT, colors.cyan);
  addRect(LEFT, 690, 82, 5, colors.cyan);
  addText('BACKEND DEVELOPER STUDY GUIDE', LEFT, 728, 10, 'F2', [0.50, 0.87, 0.90]);

  const titleLines = wrapText(title, 455, 29, 'F2');
  let titleY = 650;
  for (const line of titleLines) {
    addText(line, LEFT, titleY, 29, 'F2', colors.white);
    titleY -= 37;
  }

  addLine(LEFT, titleY - 3, 300, titleY - 3, 1.2, colors.cyan);
  let subtitleY = titleY - 42;
  for (const subtitle of subtitleLines) {
    const lines = wrapText(subtitle, 440, 12, 'F1');
    for (const line of lines) {
      addText(line, LEFT, subtitleY, 12, 'F1', [0.82, 0.87, 0.92]);
      subtitleY -= 18;
    }
    subtitleY -= 5;
  }

  addText('AUTHN', LEFT, 120, 8, 'F2', [0.50, 0.87, 0.90]);
  addText('SESSIONS', 137, 120, 8, 'F2', [0.50, 0.87, 0.90]);
  addText('JWT', 247, 120, 8, 'F2', [0.50, 0.87, 0.90]);
  addText('BROWSER SECURITY', 307, 120, 8, 'F2', [0.50, 0.87, 0.90]);
}

const lines = source.split('\n');
let index = 0;
let title = 'Authentication, Session Authentication, and JWT';
const subtitleLines = [];

if (lines[0]?.startsWith('# ')) {
  title = lines[0].slice(2).trim();
  index = 1;
}

while (index < lines.length && lines[index].trim() !== '---') {
  const line = lines[index].trim();
  if (line) subtitleLines.push(cleanInline(line));
  index += 1;
}

renderCover(title, subtitleLines);
newPage();
if (lines[index]?.trim() === '---') index += 1;

let paragraph = [];

function flushParagraph() {
  if (!paragraph.length) return;
  const text = paragraph.join(' ').trim();
  paragraph = [];
  if (!text) return;
  if (text.startsWith('KEY IDEA:')) {
    renderCallout(text.slice('KEY IDEA:'.length).trim());
  } else {
    renderParagraph(text);
  }
}

while (index < lines.length) {
  const raw = lines[index];
  const trimmed = raw.trim();

  if (trimmed.startsWith('```')) {
    flushParagraph();
    const codeLines = [];
    index += 1;
    while (index < lines.length && !lines[index].trim().startsWith('```')) {
      codeLines.push(lines[index]);
      index += 1;
    }
    renderCode(codeLines);
    index += 1;
    continue;
  }

  if (trimmed.startsWith('## ')) {
    flushParagraph();
    renderHeading(2, trimmed.slice(3));
    index += 1;
    continue;
  }

  if (trimmed.startsWith('### ')) {
    flushParagraph();
    renderHeading(3, trimmed.slice(4));
    index += 1;
    continue;
  }

  if (/^- /.test(trimmed)) {
    flushParagraph();
    renderBullet(trimmed.slice(2));
    index += 1;
    continue;
  }

  const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
  if (numbered) {
    flushParagraph();
    renderBullet(numbered[2], `${numbered[1]}.`);
    index += 1;
    continue;
  }

  if (trimmed === '---') {
    flushParagraph();
    ensureSpace(18);
    addLine(LEFT + 80, y - 5, PAGE_WIDTH - RIGHT - 80, y - 5, 0.65, colors.line);
    y -= 18;
    index += 1;
    continue;
  }

  if (!trimmed) {
    flushParagraph();
    index += 1;
    continue;
  }

  paragraph.push(trimmed);
  index += 1;
}

flushParagraph();

pages.forEach((currentPage, pageIndex) => {
  if (currentPage.cover) return;
  const previous = page;
  page = currentPage;
  addLine(LEFT, 39, PAGE_WIDTH - RIGHT, 39, 0.5, colors.line);
  addText('Authentication, Session Authentication, and JWT', LEFT, 25, 7.2, 'F1', colors.muted);
  addText(`${pageIndex + 1} / ${pages.length}`, PAGE_WIDTH - RIGHT - 34, 25, 7.2, 'F2', colors.muted);
  page = previous;
});

function buildPdf(documentPages) {
  const objects = [];
  const pageObjectIds = [];
  const streamObjectIds = [];
  const firstPageObjectId = 7;

  for (let i = 0; i < documentPages.length; i += 1) {
    pageObjectIds.push(firstPageObjectId + i * 2);
    streamObjectIds.push(firstPageObjectId + i * 2 + 1);
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${documentPages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  objects[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';

  documentPages.forEach((documentPage, pageIndex) => {
    const stream = documentPage.operations.join('\n') + '\n';
    const streamLength = Buffer.byteLength(stream, 'ascii');
    const pageId = pageObjectIds[pageIndex];
    const streamId = streamObjectIds[pageIndex];
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${streamLength} >>\nstream\n${stream}endstream`;
  });

  const chunks = [Buffer.from('%PDF-1.4\n% Generated study notes\n', 'ascii')];
  const offsets = [0];
  let currentOffset = chunks[0].length;

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    const objectText = `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
    const objectBuffer = Buffer.from(objectText, 'ascii');
    offsets[objectId] = currentOffset;
    chunks.push(objectBuffer);
    currentOffset += objectBuffer.length;
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length}\n`;
  xref += '0000000000 65535 f \n';
  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    xref += `${String(offsets[objectId]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `${xref}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, 'ascii'));
  return Buffer.concat(chunks);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, buildPdf(pages));
console.log(`Rendered ${pages.length} pages to ${outputPath}`);
