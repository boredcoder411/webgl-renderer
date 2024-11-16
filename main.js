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

// Utility to compile shaders
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Utility to create a program
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// Compile shaders
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);
gl.useProgram(program);

// Cube vertex data (positions and texture coordinates)
const vertices = new Float32Array([
  // X, Y, Z, U, V
  -1, -1, -1, 0, 0, 1, -1, -1, 1, 0, 1, 1, -1, 1, 1, -1, 1, -1, 0, 1,
  -1, -1, 1, 0, 0, 1, -1, 1, 1, 0, 1, 1, 1, 1, 1, -1, 1, 1, 0, 1,
  -1, -1, -1, 0, 0, -1, 1, -1, 1, 0, -1, 1, 1, 1, 1, -1, -1, 1, 0, 1,
  1, -1, -1, 0, 0, 1, 1, -1, 1, 0, 1, 1, 1, 1, 1, 1, -1, 1, 0, 1,
  -1, -1, -1, 0, 0, -1, -1, 1, 1, 0, 1, -1, 1, 1, 1, 1, -1, -1, 0, 1,
  -1, 1, -1, 0, 0, -1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, -1, 0, 1,
]);

const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7,
  8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15,
  16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
]);

// Set up buffers
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 5 * 4, 0);

const texCoordLocation = gl.getAttribLocation(program, "aTexCoord");
gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

// Load texture
const texture = gl.createTexture();
const image = new Image();
image.src = ttt(data)[2].toDataURL();
image.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  console.log("Texture loaded");
}
/*const texture = gl.createTexture();
const image = new Image();
image.src = "texture.jpg";
image.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  console.log("Texture loaded");
};*/

// Transformations
const matrixLocation = gl.getUniformLocation(program, "uMatrix");
const projectionMatrix = mat4.create();
const modelViewMatrix = mat4.create();
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);

function render() {
  //mat4.rotateY(modelViewMatrix, modelViewMatrix, 0.01);

  const finalMatrix = mat4.create();
  mat4.multiply(finalMatrix, projectionMatrix, modelViewMatrix);
  gl.uniformMatrix4fv(matrixLocation, false, finalMatrix);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}

gl.enable(gl.DEPTH_TEST);
render();
