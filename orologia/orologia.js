function easeInOutSin(t, b, c, d) {
  return -c/2 * (cos(PI*t/d) - 1) + b;
}

function easeTriangle(t, b, c, d) {
  t /= d;
  return (2*c*((t > 0.5) ? 1.0 - t : t)) + b;
}

function longCircle(x1, y1, x2, y2, e, target) {
  if (target === undefined)
    target = this;

  let offset = new p5.Vector(y1-y2, x2-x1);
  if (offset.x == 0 && offset.y == 0) {
    circle(x1, y1, e);
    return;
  }

  offset.normalize();
  offset.mult(0.5*e);

  let angle = offset.heading();

  target.push();
  target.noStroke();
  target.ellipseMode(CENTER);
  
  target.circle(x1, y1, e);
  target.circle(x2, y2, e);

  target.quad(x1 + offset.x, y1 + offset.y,
             x1 - offset.x, y1 - offset.y,
             x2 - offset.x, y2 - offset.y,
             x2 + offset.x, y2 + offset.y);

  target.pop();

  target.push();
  target.noFill();
  
  target.arc(x1, y1, e, e, angle, angle + PI, OPEN);
  target.arc(x2, y2, e, e, angle - PI, angle, OPEN);

  target.line(x1 + offset.x, y1 + offset.y, x2 + offset.x, y2 + offset.y);
  target.line(x1 - offset.x, y1 - offset.y, x2 - offset.x, y2 - offset.y);
  target.pop();
}

let secAngle = 0;

let lastSec = 0;
let fromLastSec = 0;

function setup() {
  secAngle = TWO_PI/60;

  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.style('display', 'block');

  background(0);

  lastSec = second();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function secInterp(elapsed) {
  return max(0, (elapsed - 0.6)) / 0.4;
}

function draw() {
  fill(0);
  noStroke();
  rect(0, 0, width, height);

  let s = second();
  if (s != lastSec) {
    lastSec = s;
    fromLastSec = 0;
  }

  translate(width/2, height/2);

  push();
  strokeWeight(3);
  strokeCap(ROUND);
  fill(255);
  noStroke();

  for (let i = 0; i < 60; ++i) {
    push();
    rotate(i*secAngle);
    if (i % 5 != 0) {
      circle(0, -200, 3);
    } else {
      stroke(255);
      noFill();
      line(0, -198, 0, -206);
    }
    pop();
  }

  pop();

  stroke(255);
  fill(255);

  strokeWeight(5);

  push();
  rotate((hour()*3600 + minute()*60 + s + fromLastSec)*secAngle/720);
  line(0, 0, 0, -100);
  pop();

  strokeWeight(3);
  
  push();
  rotate((minute()*60 + s + fromLastSec)*(secAngle/60));
  line(0, 0, 0, -180);
  pop();

  stroke(255, 0, 0);
  fill(255, 0, 0);
  strokeWeight(3);

  push();
  rotate((s + easeInOutSin(secInterp(fromLastSec), 0, 1, 1))*secAngle);
  line(0, 0, 0, -200);
  longCircle(0, -200, easeInOutSin(easeTriangle(secInterp(fromLastSec), 0, 1, 1), 0, -8, 1), -200, 10);
  pop();

  fromLastSec += deltaTime/1000;
}
