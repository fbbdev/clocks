p5.prototype.registerPromisePreload({ target: opentype, method: 'load', addCallbacks: true });

const fontSize = 150;
const dotSize = 0.15;

let ctx = null;

let glyphWidth = 0;
let glyphHeight = 0;
let figures = [];
let specialFigures = [];

function prepareGlyphs(font, size) {
  let glyphs = font.stringToGlyphs("9012345678");

  let fontScale = size / font.unitsPerEm;
  glyphWidth = fontScale*glyphs.reduce((w, g) => Math.max(w, g.advanceWidth), glyphs[0].advanceWidth);

  let bbox = font.getPath("0123456789", 0, 0, size, { kerning: false }).getBoundingBox();
  let numHeight = -bbox.y1;
  glyphHeight = bbox.y2 - bbox.y1;

  glyphs.forEach((g, i) => glyphs[i] = g.getPath(0, numHeight, size));

  for (let i = 0; i < glyphs.length; ++i)
    figures.push(opath_interpolate(glyphs[i], glyphs[(i+1) % glyphs.length]));

  specialFigures[0] = opath_interpolate(glyphs[3], glyphs[1]);
  specialFigures[1] = figures[1];
  specialFigures[2] = figures[2];
  specialFigures[3] = opath_interpolate(glyphs[4], glyphs[1]);
  specialFigures[5] = opath_interpolate(glyphs[6], glyphs[1]);
}

function preload() {
  opentype.load("fonts/SourceCodePro-Regular.ttf", font => prepareGlyphs(font, fontSize));
}

let lastSec = 0;
let elapsed = 0;

function windowResized(ev) {
  if (ev && ev.type === 'orientationchange')
    setTimeout(windowResized, 200);

  resizeCanvas(windowWidth, windowHeight);
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.style('display', 'block');

  ctx = canvas.elt.getContext('2d');

  background(0);

  window.addEventListener('orientationchange', windowResized);
}

function figure(fig, t, interpolators) {
  let path = new Path2D((interpolators || figures)[fig](t));
  ctx.fill(path, 'evenodd');
  ctx.stroke(path);
}

function clockFigureEasing(t) {
  return Math.min(1, t/0.2);
}

function clockDotEasing(s, t) {
  return 0.5*(t + (s % 2));
}

function secMarkerEasing(i, m, s, t) {
  //let evenm = (m % 2 === 0);
  t = Math.min(1, t/0.4);
  //return Math.min(1, Math.max(0, (evenm ? t : 1 - t) - (evenm ? i - s : s - i)));
  return Math.min(1, Math.max(0, t - i - 1 + s))
}

function clockFigures(h, m, s, t) {
  let changem = (s === 0);
  let changeM = changem && (m % 10 === 0);
  let changeh = changem && (m === 0);
  let changeH = changeh && (h % 10 === 0);

  let resetM  = changeh && (t < 1);
  let reseth  = resetM && (h === 0);

  push();

  figure(~~(h/10), changeH ? t : 1, specialFigures);
  translate(glyphWidth, 0);
  figure(h % 10 + (reseth ? 3 : 0), changeh ? t : 1, reseth ? specialFigures : figures);
  translate(glyphWidth*1.5, 0);
  figure(~~(m/10) + (resetM ? 5 : 0), changeM ? t : 1, resetM ? specialFigures : figures);
  translate(glyphWidth, 0);
  figure(m % 10, changem ? t : 1);

  pop();
}

function aberratedStroke(col, fn) {
  push();
  blendMode(ADD);

  translate(1, -0.5);
  stroke(0, green(col), 0, alpha(col));
  fn();

  translate(-0.5, 1);
  stroke(0, 0, blue(col), alpha(col));
  fn();

  translate(-1, -0.5);
  stroke(red(col), 0, 0, alpha(col));
  fn();

  pop();
}

function aberrated(col, fn) {
  push();
  blendMode(ADD);

  translate(1, -0.5);
  fill(0, green(col), 0, alpha(col));
  fn();

  translate(-0.5, 1);
  fill(0, 0, blue(col), alpha(col));
  fn();

  translate(-1, -0.5);
  fill(red(col), 0, 0, alpha(col));
  fn();

  pop();
}

function draw() {
  noStroke();
  fill(0);
  rect(0, 0, width, height);

  let h = hour();
  let m = minute();
  let s = second();
  if (s !== lastSec) {
    lastSec = s;
    elapsed = 0;
  }

  translate(0.5*width, 0.5*height - 0.25*glyphHeight);

  // Draw figures
  let figureTime = clockFigureEasing(elapsed);

  push();
  translate(-2.25*glyphWidth, -0.5*glyphHeight);
  aberrated(color(255), () => clockFigures(h, m, s, figureTime));
  pop();

  // Draw dots
  let dotTime = clockDotEasing(s, elapsed);
  let dotDiameter = dotSize*glyphHeight;

  noFill();
  strokeWeight(2);
  aberratedStroke(color(75, 255, 180, 255*(0.8 - dotTime)), () => {
    circle(0, -0.25*glyphHeight, dotDiameter*(1 + 1.5*dotTime));
    circle(0,  0.25*glyphHeight, dotDiameter*(1 + 1.5*dotTime));
  });

  noStroke();
  if (s % 2 === 0) {
    aberrated(color(255), () => {
      circle(0, -0.25*glyphHeight, dotDiameter*(1 - 0.7*dotTime));
      circle(0,  0.25*glyphHeight, dotDiameter*(1 - 0.7*dotTime));
    });
  }

  // Draw second markers
  push();
  translate(-2.25*glyphWidth, glyphHeight);

  let step = (4.5*glyphWidth)/60;

  aberratedStroke(color(75, 255, 180), () => {
    for (let i = 0; i < 59; ++i) {
      let mHeight = 8*secMarkerEasing(i, m, s, elapsed);
      line(i*step, 0, i*step, -mHeight);
    }
  });

  pop();

  elapsed += deltaTime/1000;
  if (elapsed >= 1)
    elapsed = 1;
}
