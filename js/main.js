import { mat4, vec3 } from "gl-matrix";
import { vertexShaderSource, fragmentShaderSource } from "./shader.js";
import { data } from "./data.js";

const canvas = document.getElementById("webglCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext("webgl2");
if (!gl) {
  console.error("WebGL not supported");
  throw new Error("WebGL not supported");
}

class ShaderProgram {
  constructor(gl, vertexSource, fragmentSource) {
    this.gl = gl;
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
    this.program = this.createProgram(vertexShader, fragmentShader);
    gl.useProgram(this.program);
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error("Program link error:", this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  getAttribLocation(name) {
    return this.gl.getAttribLocation(this.program, name);
  }

  getUniformLocation(name) {
    return this.gl.getUniformLocation(this.program, name);
  }
}

class Buffer {
  constructor(gl, data, type, usage) {
    this.gl = gl;
    this.buffer = gl.createBuffer();
    this.type = type;
    this.length = data.length; // Store the number of elements
    gl.bindBuffer(type, this.buffer);
    gl.bufferData(type, data, usage);
  }

  bind() {
    this.gl.bindBuffer(this.type, this.buffer);
  }
}

class Texture {
  constructor(gl, source) {
    this.gl = gl;
    this.texture = gl.createTexture();
    this.image = new Image();
    this.image.src = source;
    this.image.onload = () => this.loadTexture();
  }

  loadTexture() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    gl.generateMipmap(gl.TEXTURE_2D);
    console.log("Texture loaded");
  }
}

class SceneObject {
  constructor(gl, program, vertices, indices, textureSource) {
    this.gl = gl;
    this.program = program;
    this.texture = new Texture(gl, textureSource);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.vertexBuffer = new Buffer(gl, vertices, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
    this.indexBuffer = new Buffer(gl, indices, gl.ELEMENT_ARRAY_BUFFER, gl.STATIC_DRAW);

    const positionLocation = program.getAttribLocation("aPosition");
    const texCoordLocation = program.getAttribLocation("aTexCoord");

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 5 * 4, 0);

    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

    this.modelMatrix = mat4.create();

    this.boundingBox = { min: [0, 0, 0], max: [0, 0, 0] }; // Default box
  }

  setTransform(transformMatrix) {
    mat4.copy(this.modelMatrix, transformMatrix); // Now this updates only the modelMatrix
  }

  render(matrixLocation, projectionMatrix, viewMatrix) {
    const gl = this.gl;

    // Ensure texture is bound for the specific object
    gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);

    // Combine view and model matrices to create the model-view matrix
    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, viewMatrix, this.modelMatrix);

    // Multiply by the projection matrix to get the final matrix
    const finalMatrix = mat4.create();
    mat4.multiply(finalMatrix, projectionMatrix, modelViewMatrix);

    // Pass the final transformation matrix to the shader
    gl.uniformMatrix4fv(matrixLocation, false, finalMatrix);

    // Bind the VAO and draw the object
    gl.bindVertexArray(this.vao);
    const indexCount = this.indexBuffer.length;
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }

  updateBoundingBox() {
    const min = [-Infinity, -Infinity, -Infinity];
    const max = [Infinity, Infinity, Infinity];

    const width = this.width || 1;
    const height = this.height || 1;
    const depth = this.depth || 1;

    // Calculate based on the current transform
    const position = [this.modelMatrix[12], this.modelMatrix[13], this.modelMatrix[14]];

    this.boundingBox = {
      min: [position[0] - width / 2, position[1] - height / 2, position[2] - depth / 2],
      max: [position[0] + width / 2, position[1] + height / 2, position[2] + depth / 2],
    };
  }
}

function isPointInsideAABB(point, box) {
  return (
    point[0] >= box.min[0] &&
    point[0] <= box.max[0] &&
    point[1] >= box.min[1] &&
    point[1] <= box.max[1] &&
    point[2] >= box.min[2] &&
    point[2] <= box.max[2]
  );
}

function getClosestPointOnAABB(point, box) {
  const closest = [
    Math.max(box.min[0], Math.min(point[0], box.max[0])),
    Math.max(box.min[1], Math.min(point[1], box.max[1])),
    Math.max(box.min[2], Math.min(point[2], box.max[2])),
  ];
  return closest;
}

function checkCollisions(playerPosition, sceneObjects, cameraRadius) {
  for (const object of sceneObjects) {
    object.updateBoundingBox(); // Ensure bounding box is up-to-date

    const closestPoint = getClosestPointOnAABB(playerPosition, object.boundingBox);
    const distance = Math.sqrt(
      (closestPoint[0] - playerPosition[0]) ** 2 +
      (closestPoint[1] - playerPosition[1]) ** 2 +
      (closestPoint[2] - playerPosition[2]) ** 2
    );

    if (distance < cameraRadius) {
      // calculate the collision normal
      const normal = vec3.create();
      vec3.sub(normal, playerPosition, closestPoint);
      vec3.normalize(normal, normal);
      return { collision: true, normal: normal }; // Collision detected
    }
  }
  return { collision: false }; // No collision
}

class Cube extends SceneObject {
  constructor(gl, program, textureSource, width = 1, height = 1, depth = 1) {
    const vertices = new Float32Array([
      // Front face
      -width / 2, -height / 2, depth / 2, 0.0, 0.0,
      width / 2, -height / 2, depth / 2, 1.0, 0.0,
      width / 2, height / 2, depth / 2, 1.0, 1.0,
      -width / 2, height / 2, depth / 2, 0.0, 1.0,

      // Back face
      -width / 2, -height / 2, -depth / 2, 0.0, 0.0,
      -width / 2, height / 2, -depth / 2, 0.0, 1.0,
      width / 2, height / 2, -depth / 2, 1.0, 1.0,
      width / 2, -height / 2, -depth / 2, 1.0, 0.0,

      // Top face
      -width / 2, height / 2, -depth / 2, 1.0, 0.0,
      -width / 2, height / 2, depth / 2, 1.0, 1.0,
      width / 2, height / 2, depth / 2, 0.0, 1.0,
      width / 2, height / 2, -depth / 2, 0.0, 0.0,

      // Bottom face
      -width / 2, -height / 2, -depth / 2, 0.0, 0.0,
      width / 2, -height / 2, -depth / 2, 1.0, 0.0,
      width / 2, -height / 2, depth / 2, 1.0, 1.0,
      -width / 2, -height / 2, depth / 2, 0.0, 1.0,

      // Right face
      width / 2, -height / 2, -depth / 2, 0.0, 0,
      width / 2, height / 2, -depth / 2, 1.0, 0.0,
      width / 2, height / 2, depth / 2, 1.0, 1.0,
      width / 2, -height / 2, depth / 2, 0.0, 1.0,

      // Left face
      -width / 2, -height / 2, -depth / 2, 0.0, 0.0,
      -width / 2, -height / 2, depth / 2, 1.0, 0.0,
      -width / 2, height / 2, depth / 2, 1.0, 1.0,
      -width / 2, height / 2, -depth / 2, 0.0, 1.0,
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3, // Front face
      4, 5, 6, 4, 6, 7, // Back face
      8, 9, 10, 8, 10, 11, // Top face
      12, 13, 14, 12, 14, 15, // Bottom face
      16, 17, 18, 16, 18, 19, // Right face
      20, 21, 22, 20, 22, 23, // Left face
    ]);

    super(gl, program, vertices, indices, textureSource);
  }
}

class Plane extends SceneObject {
  constructor(gl, program, textureSource, width = 2, height = 2) {
    // Vertices and texture coordinates for a flat plane
    const vertices = new Float32Array([
      // X, Y, Z, U, V
      -width / 2, -height / 2, 0, 0, 0,  // Bottom-left
      width / 2, -height / 2, 0, 1, 0,  // Bottom-right
      width / 2, height / 2, 0, 1, 1,  // Top-right
      -width / 2, height / 2, 0, 0, 1,  // Top-left
    ]);

    // Indices to draw two triangles forming the plane
    const indices = new Uint16Array([
      0, 1, 2,  // First triangle
      0, 2, 3,  // Second triangle
    ]);

    super(gl, program, vertices, indices, textureSource);
  }
}

// ray from camera forwards infinitely into the scene
// returns the closest object hit by the ray
function raycast(cameraPosition, cameraDirection, sceneObjects) {
  let closestObject = null;
  let closestDistance = Infinity;

  for (const object of sceneObjects) {
    const ray = {
      origin: cameraPosition,
      direction: cameraDirection,
    };

    const hit = rayIntersectsAABB(ray, object.boundingBox);
    if (hit) {
      const distance = vec3.distance(cameraPosition, hit);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestObject = object;
      }
    }
  }

  return closestObject;
}

function rayIntersectsAABB(ray, box) {
  const t1 = (box.min[0] - ray.origin[0]) / ray.direction[0];
  const t2 = (box.max[0] - ray.origin[0]) / ray.direction[0];
  const t3 = (box.min[1] - ray.origin[1]) / ray.direction[1];
  const t4 = (box.max[1] - ray.origin[1]) / ray.direction[1];
  const t5 = (box.min[2] - ray.origin[2]) / ray.direction[2];
  const t6 = (box.max[2] - ray.origin[2]) / ray.direction[2];

  const tmin = Math.max(
    Math.min(t1, t2),
    Math.min(t3, t4),
    Math.min(t5, t6)
  );

  const tmax = Math.min(
    Math.max(t1, t2),
    Math.max(t3, t4),
    Math.max(t5, t6)
  );

  if (tmax < 0) {
    return null;
  }

  if (tmin > tmax) {
    return null;
  }

  const hit = vec3.create();
  vec3.scaleAndAdd(hit, ray.origin, ray.direction, tmin);
  return hit;
}

// Setup scene
const program = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
const matrixLocation = program.getUniformLocation("uMatrix");
var scene = [];

const cube = new Cube(gl, program, "texture.png");
//scene.push(cube);

const plane = new Plane(gl, program, "texture.png", 10, 10);
scene.push(plane);

// rotate plane
mat4.rotateX(plane.modelMatrix, plane.modelMatrix, Math.PI / 2);

// move plane down
mat4.translate(plane.modelMatrix, plane.modelMatrix, [0, 0, 10]);

// move bounding box down
plane.updateBoundingBox();

// Camera setup
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

const modelViewMatrix = mat4.create();
mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);

const viewMatrix = mat4.create();
mat4.lookAt(viewMatrix, [0, 0, 0], [0, 0, -1], [0, 1, 0]);

const cameraMatrix = mat4.create();
mat4.invert(cameraMatrix, viewMatrix);

let yaw = 0;
let pitch = 0;
const position = [0, 0, 6]; // Camera position in world space

function updateCamera(translation, rotation) {
  yaw += rotation[1];
  pitch += rotation[0];

  const maxPitch = Math.PI / 2 - 0.01;
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

  // Reset rotation matrix
  const yawMatrix = mat4.create();
  mat4.rotateY(yawMatrix, yawMatrix, yaw);

  const pitchMatrix = mat4.create();
  mat4.rotateX(pitchMatrix, pitchMatrix, pitch);

  // Combine yaw (global Y-axis) and pitch (local X-axis)
  const rotationMatrix = mat4.create();
  mat4.multiply(rotationMatrix, yawMatrix, pitchMatrix);

  const translationMatrix = mat4.create();
  mat4.translate(translationMatrix, translationMatrix, position);

  mat4.multiply(cameraMatrix, translationMatrix, rotationMatrix);

  // Update camera position
  position[0] += translation[0];
  position[1] += translation[1];
  position[2] += translation[2];
}

let keys = {};

function render() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  handlePlayerInput();

  // Invert camera matrix to simulate moving camera
  const viewMatrix = mat4.create();
  mat4.invert(viewMatrix, cameraMatrix);

  // Render each object with the view and projection matrices applied
  scene.forEach((object) => {
    object.render(matrixLocation, projectionMatrix, viewMatrix);
  });

  requestAnimationFrame(render);
}

gl.enable(gl.DEPTH_TEST);
render();

function handlePlayerInput() {
  const speed = 0.1;
  const forward = calculateForwardVector();
  const right = calculateRightVector();
  const attemptedPosition = [...position];

  // Calculate desired movement
  let movement = [0, 0, 0];
  if (keys["w"]) {
    vec3.scaleAndAdd(movement, movement, forward, speed);
  }
  if (keys["s"]) {
    vec3.scaleAndAdd(movement, movement, forward, -speed);
  }
  if (keys["a"]) {
    vec3.scaleAndAdd(movement, movement, right, -speed);
  }
  if (keys["d"]) {
    vec3.scaleAndAdd(movement, movement, right, speed);
  }

  // Apply movement to attempted position
  vec3.add(attemptedPosition, attemptedPosition, movement);

  const cameraRadius = 0.5;
  const collisionResult = checkCollisions(attemptedPosition, scene, cameraRadius);

  if (collisionResult.collision) {
    // Slide along collision surface
    const normal = collisionResult.normal;

    // Remove movement along the collision normal
    const dot = vec3.dot(movement, normal);
    const slideVector = vec3.create();
    vec3.scaleAndAdd(slideVector, movement, normal, -dot);

    // Apply the slide vector
    vec3.add(position, position, slideVector);
  } else {
    // No collision, apply full movement
    vec3.copy(position, attemptedPosition);
  }

  updateCamera([0, 0, 0], [0, 0]); // Update the camera transform
}

function calculateForwardVector() {
  // calculate the forward vector
  const forward = [0, 0, 0];
  forward[0] = -Math.sin(yaw);
  //forward[1] = Math.sin(pitch);
  forward[1] = 0;
  forward[2] = -Math.cos(yaw);

  // normalize the vector
  const length = Math.sqrt(forward[0] * forward[0] + forward[1] * forward[1] + forward[2] * forward[2]);
  forward[0] /= length;
  forward[1] /= length;
  forward[2] /= length;

  return forward;
}

function calculateRightVector() {
  // calculate the right vector
  const right = [0, 0, 0];
  right[0] = Math.cos(yaw);
  right[1] = 0;
  right[2] = -Math.sin(yaw);

  // normalize the vector
  const length = Math.sqrt(right[0] * right[0] + right[1] * right[1] + right[2] * right[2]);
  right[0] /= length;
  right[1] /= length;
  right[2] /= length;

  return right;
}

document.addEventListener("keydown", (event) => {
  keys[event.key] = true;
});

document.addEventListener("keyup", (event) => {
  keys[event.key] = false;
});

var lock = false;

document.addEventListener("mousemove", (event) => {
  const sensitivity = -0.005;
  const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

  if (lock) {
    const rotation = [movementY * sensitivity, movementX * sensitivity];
    updateCamera([0, 0, 0], rotation);
  }
});

canvas.addEventListener("click", (event) => {
  canvas.requestPointerLock();
  lock = true;

  // raycast from camera
  const cameraDirection = calculateForwardVector();
  const hitObject = raycast(position, cameraDirection, scene);
  if (hitObject) {
    console.log("Hit object:", hitObject);
  }
});

// unlock when no longer in pointer lock
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== canvas) {
    lock = false;
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
});