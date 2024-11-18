import { mat4 } from "gl-matrix";
import { vertexShaderSource, fragmentShaderSource } from "./shader.js";
import { ttt } from "./ttt.js";
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

// Setup scene
const program = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
const matrixLocation = program.getUniformLocation("uMatrix");
var scene = [];

const cube = new Cube(gl, program, ttt(data)[2].toDataURL());
scene.push(cube);

const plane = new Plane(gl, program, ttt(data)[1].toDataURL());
scene.push(plane);

// Camera setup
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);

const modelViewMatrix = mat4.create();
mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);

const viewMatrix = mat4.create();
mat4.lookAt(viewMatrix, [0, 0, 0], [0, 0, -1], [0, 1, 0]);

const cameraMatrix = mat4.create();
mat4.identity(cameraMatrix); // Start with an identity matrix

function updateCamera(translation, rotation) {
  // Apply rotation first
  mat4.rotateX(cameraMatrix, cameraMatrix, rotation[0]);
  mat4.rotateY(cameraMatrix, cameraMatrix, rotation[1]);

  // Then apply translation
  mat4.translate(cameraMatrix, cameraMatrix, translation);
}

function render() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

document.addEventListener("keydown", (event) => {
  if (event.key === "w") {
    updateCamera([0, 0, -0.1], [0, 0, 0]);
  } else if (event.key === "s") {
    updateCamera([0, 0, 0.1], [0, 0, 0]);
  } else if (event.key === "a") {
    updateCamera([-0.1, 0, 0], [0, 0, 0]);
  } else if (event.key === "d") {
    updateCamera([0.1, 0, 0], [0, 0, 0]);
  }
});

var lock = false;

document.addEventListener("mousemove", (event) => {
  const sensitivity = -0.01;
  const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

  if(lock) {
    const rotation = [movementY * sensitivity, movementX * sensitivity];
    updateCamera([0, 0, 0], rotation);
  }
});

canvas.addEventListener("click", (event) => {
  canvas.requestPointerLock();
  lock = true;
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