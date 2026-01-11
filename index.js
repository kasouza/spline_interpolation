class Point {
  /** @type {number} */
  x;

  /** @type {number} */
  y;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Canvas {
  /** @type {HTMLCanvasElement} */
  canvasElement;

  /** @type {CanvasRenderingContext2D} */
  ctx;

  constructor() {
    this.canvasElement = document.querySelector("#canvas");
    if (!this.canvasElement) {
      throw new Error("Canvas element not found");
    }

    this.ctx = this.canvasElement.getContext("2d");
    if (!this.ctx) {
      throw new Error("2D context not available");
    }
  }

  get width() {
    return this.canvasElement.width;
  }

  get height() {
    return this.canvasElement.height;
  }

  /**
   * @param {Point} pointA 
   * @param {Point} pointB 
   * @param {*} color
   */
  drawLine(pointA, pointB, color = null) {
    if (color) {
      this.ctx.strokeStyle = color;
    }

    this.ctx.save();
    this.ctx.beginPath();

    this.ctx.moveTo(pointA.x, this.height - pointA.y);
    this.ctx.lineTo(pointB.x, this.height - pointB.y);

    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * @param {Point} point 
   * @param {number} width
   * @param {*} color
   */
  drawPoint(point, width = 1, color = null) {
    if (color) {
      this.ctx.fillStyle = color;
    }

    this.ctx.beginPath()

    this.ctx.ellipse(
      point.x,
      this.height - point.y,
      width,
      width,
      0,
      0,
      Math.PI * 2
    );

    this.ctx.fill();
  }
}

/**
 * @param {Canvas} canvas
 * @param {Point[]} points 
 * @param {boolean} drawLines
 * @param {boolean} drawPoints
 */
function drawLines(canvas, points, drawLines, drawPoints) {
  if (drawLines) {
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      if (!next) {
        continue;
      }

      canvas.drawLine(current, next, "red");
    }
  }

  if (drawPoints) {
    for (let i = 0; i < points.length; i++) {
      canvas.drawPoint(points[i], 4, "green");
    }
  }
}

/**
 * @param {Point[]} points
 */
function interpolatePoints(points) {
  const newPoints = [];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    newPoints.push(current);

    if (next) {
      const step = 0.1;
      const slope = (next.y - current.y) / (next.x - current.x);

      let x = current.x;

      while (x < next.x) {
        const y = current.y + slope * (x - current.x);

        newPoints.push(new Point(x, y));
        x += step;
      }
    }
  }

  return newPoints;
}

function lines() {
}

function ensureShape(matrix, numRows, numColumns) {
  if (matrix.length !== numRows) {
    throw new Error("Matrix does not have the correct number of rows");
  }

  for (const row of matrix) {
    if (row.length !== numColumns) {
      throw new Error("Matrix does not have the correct number of columns");
    }
  }
}

function ensureSquare(matrix) {
  const nColumns = matrix[0].length;

  if (matrix.length !== nColumns) {
    throw new Error("Matrix is not square (number of rows is different to the number of columns)");
  }

  for (const row of matrix) {
    if (row.length !== nColumns) {
      throw new Error("Matrix is not square (row has different number of columns)");
    }
  }

  return nColumns;
}

function clone(matrix) {
  const newMatrix = [];

  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (!newMatrix[i]) {
        newMatrix[i] = [];
      }

      newMatrix[i][j] = matrix[i][j];
    }
  }

  return newMatrix;
}

function isZero(val) {
  return Math.abs(val) < 1e-10;
}

function gaussElimination(matrix, constantMatrix) {
  const size = ensureSquare(matrix);
  ensureShape(constantMatrix, size, 1);

  const augmentedMatrix = clone(matrix);
  for (let i = 0; i < size; i++) {
    augmentedMatrix[i][size] = constantMatrix[i][0];
  }

  const augmentedMatrixNColumns = size + 1;

  // Build upper-triangular matrix
  for (let col = 0; col < size - 1; col++) {
    for (let j = col + 1; j < size; j++) {
      if (Math.abs(augmentedMatrix[col][col]) < Math.abs(augmentedMatrix[j][col])) {
        const temp = augmentedMatrix[col];

        augmentedMatrix[col] = augmentedMatrix[j];
        augmentedMatrix[j] = temp;
      }
    }

    for (let row = col + 1; row < size; row++) {
      if (isZero(augmentedMatrix[row][col])) {
        continue;
      }

      if (isZero(augmentedMatrix[col][col])) {
        throw new Error("Matrix is singular");
      }

      const scalingFactor = augmentedMatrix[row][col] / augmentedMatrix[col][col];

      for (let k = col; k < augmentedMatrixNColumns; k++) {
        augmentedMatrix[row][k] = augmentedMatrix[row][k] - augmentedMatrix[col][k] * scalingFactor;
      }
    }
  }

  const results = [];
  for (let i = size - 1; i >= 0; i--) {
    results[i] = 0;
  }

  for (let i = size - 1; i >= 0; i--) {
    let val = augmentedMatrix[i][size];

    for (let j = size - 1; j > i; j--) {
      val -= results[j] * augmentedMatrix[i][j];
    }

    if (isZero(val)) {
      results[i] = 0;
    } else {
      if (isZero(augmentedMatrix[i][i])) {
        throw new Error("The system has no unique solution");
      }

      results[i] = val / augmentedMatrix[i][i];
    }
  }

  return results;
}

/**
 * @param {Point[]} points 
 */
function splineInterpolation(points) {
  // a1x^2 + b1x + c1
  // a2x^2 + b2x + c2
  // a3x^2 + b3x + c3

  const nEquations = (points.length - 1);
  const nTotalEquations = nEquations * 3;
  const matrix = [];
  const constantMatrix = [];

  const nCoefficients = 3;

  // Equations at internal points are equal
  for (let equation = 0; equation < nEquations; equation++) {
    for (let i = 0; i < 2; i++) {
      // a1(1)^2 + b1(1) + c1 = 2
      // a1 + b1 + c1 = 2

      // a2(3)^2 + b2(3) + c2 = 3
      // 9a2 + 3b2 + c2 = 3
      const point = points[equation + i];

      const coefficients = [
        point.x * point.x,
        point.x,
        1,
      ];

      const row = [];

      for (let j = 0; j < nTotalEquations; j++) {
        if (j >= (equation * nCoefficients) && j < ((equation + 1) * nCoefficients)) {
          row.push(coefficients[j - (equation * nCoefficients)]);
        } else {
          row.push(0);
        }
      }

      matrix.push(row);
      constantMatrix.push(point.y);
    }
  }

  // Derivatives of equations at the internal points are equal
  for (let i = 1; i < points.length - 1; i++) {
    // D(a1(3)^2 + b1(3) + c1) = D(a2(3)^2 + b2(3) + c2)
    // 2a1(3) + b1 = 2a2(3) + b2
    // 6a1 + b1 = 6a2 + b2
    // 6a1 + b1 - 6a2 + b2 = 0
    const point = points[i];

    const eq1 = i - 1;
    const eq2 = i;

    const row = [];

    const coefficients = [
      2 * point.x,
      1,
      0,
    ];

    const coefficientsEq2 = [
      -(2 * point.x),
      -1,
      0,
    ];

    for (let j = 0; j < nTotalEquations; j++) {
      if (j >= (eq1 * nCoefficients) && j < ((eq1 + 1) * nCoefficients)) {
        row.push(coefficients[j - (eq1 * nCoefficients)]);
      } else if (j >= (eq2 * nCoefficients) && j < ((eq2 + 1) * nCoefficients)) {
        row.push(coefficientsEq2[j - (eq2 * nCoefficients)]);
      } else {
        row.push(0);
      }
    }

    matrix.push(row);
    constantMatrix.push(0);
  }

  // Second derivative of first point is 0
  // D(D(a1x^2 + b1x + c1))
  // D(2a1x + b1)
  // 2 * D(a1x) + 0
  // 2 * (a1 * D(x))
  // 2 * (a1 * 1)
  // 2a1 = 0

  const row = []
  for (let i = 0; i < nTotalEquations; i++) {
    row.push(0);
  }

  row[0] = 2;

  matrix.push(row);
  constantMatrix.push(0);

  const result = gaussElimination(matrix, constantMatrix.map(n => [n]));

  const equations = [];
  for (let i = 0; i < nEquations; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    equations.push({
      xMin: p1.x,
      xMax: p2.x,
      coefficients: result.slice(i * nCoefficients, (i + 1) * nCoefficients)
    });
  }

  const newPoints = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const step = 1;

    for (let x = p1.x; x <= p2.x; x += step) {
      for (const equation of equations) {
        if (x >= equation.xMin && x <= equation.xMax) {

          const [a, b, c] = equation.coefficients;
          const y = a * x * x + b * x + c;

          newPoints.push(new Point(x, y));
          break;
        }
      }
    }
  }

  return newPoints;
}

function matrices() {
  const points = [
    new Point(1, 5),
    new Point(3, 3),
    new Point(5, 9),
    new Point(8, 10),
  ]

  points.forEach(p => {
    p.x *= 40;
    p.y *= 10;
  })

  const canvas = new Canvas();

  const interpolated = splineInterpolation(points);
  drawLines(canvas, points, false, true);
  drawLines(canvas, interpolated, true, false);

  //const matrix = [
  //[2, 4, 1],
  //[3, 2, 1],
  //[0, 1, 2],
  //];

  //const constantMatrix = [
  //[1],
  //[2],
  //[4],
  //];

  //const matrix = [
  //[1, 2],
  //[2, 4]
  //];

  //const constantMatrix = [
  //[9],
  //[18],
  //];

  //const result = gaussElimination(matrix, constantMatrix);
  //console.log(result);
}

function main() {
  matrices();
}

window.addEventListener("load", main);
