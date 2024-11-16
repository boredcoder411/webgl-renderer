export const vertexShaderSource = `
  attribute vec4 aPosition;
  attribute vec2 aTexCoord;
  uniform mat4 uMatrix;
  varying vec2 vTexCoord;
  void main() {
    gl_Position = uMatrix * aPosition;
    vTexCoord = aTexCoord;
  }
`;

export const fragmentShaderSource = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uTexture;
  void main() {
    gl_FragColor = texture2D(uTexture, vTexCoord);
  }
`;
