import { useEffect, useRef, useState } from 'react';
import { mat4, quat, vec2, vec3 } from 'gl-matrix';
import './InfiniteMenu.css';

const discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
    int itemIndex = vInstanceId % uItemCount;
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = clamp(st, 0.0, 1.0);
    st = st * cellSize + cellOffset;

    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}
`;

class Face {
  constructor(a, b, c) { this.a = a; this.b = b; this.c = c; }
}

class Vertex {
  constructor(x, y, z) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class Geometry {
  constructor() { this.vertices = []; this.faces = []; }

  addVertex(...args) {
    for (let i = 0; i < args.length; i += 3)
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    return this;
  }

  addFace(...args) {
    for (let i = 0; i < args.length; i += 3)
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    return this;
  }

  get lastVertex() { return this.vertices[this.vertices.length - 1]; }

  subdivide(divisions = 1) {
    const midPointCache = {};
    let f = this.faces;
    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array(f.length * 4);
      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);
        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });
      f = newFaces;
    }
    this.faces = f;
    return this;
  }

  spherize(radius = 1) {
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return { vertices: this.vertexData, indices: this.indexData, normals: this.normalData, uvs: this.uvData };
  }
  get vertexData() { return new Float32Array(this.vertices.flatMap(v => Array.from(v.position))); }
  get normalData() { return new Float32Array(this.vertices.flatMap(v => Array.from(v.normal))); }
  get uvData() { return new Float32Array(this.vertices.flatMap(v => Array.from(v.uv))); }
  get indexData() { return new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c])); }

  getMidPoint(ndxA, ndxB, cache) {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey];
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(-1,t,0, 1,t,0, -1,-t,0, 1,-t,0, 0,-1,t, 0,1,t, 0,-1,-t, 0,1,-t, t,0,-1, t,0,1, -t,0,-1, -t,0,1)
      .addFace(0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11, 1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8, 3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9, 4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1);
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);
    const alpha = (2 * Math.PI) / steps;
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;
    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;
      if (i > 0) this.addFace(0, i, i + 1);
    }
    this.addFace(0, steps, 1);
  }
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl, shaderSources, transformFeedbackVaryings, attribLocations) {
  const program = gl.createProgram();
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    const shader = createShader(gl, type, shaderSources[ndx]);
    if (shader) gl.attachShader(program, shader);
  });
  if (transformFeedbackVaryings)
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
  if (attribLocations)
    for (const attrib in attribLocations)
      gl.bindAttribLocation(program, attribLocations[attrib], attrib);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function makeVertexArray(gl, bufLocNumElmPairs, indices) {
  const va = gl.createVertexArray();
  gl.bindVertexArray(va);
  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return va;
}

function resizeCanvasToDisplaySize(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio);
  const displayWidth = Math.round(canvas.clientWidth * dpr);
  const displayHeight = Math.round(canvas.clientHeight * dpr);
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) { canvas.width = displayWidth; canvas.height = displayHeight; }
  return needResize;
}

function makeBuffer(gl, sizeOrData, usage) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, sizeOrData, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createAndSetupTexture(gl, minFilter, magFilter, wrapS, wrapT) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  return texture;
}

// ─── Inline SVG logos (no CORS, always available) ───────────────────────────
const LOGO_SVGS = {
  zendesk: `<!-- License: CC0. Made by SVG Repo: https://www.svgrepo.com/svg/331269/zendesk -->
<svg width="1024px" height="1024px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
   <circle cx="512" cy="512" r="512" style="fill:#03363d"/>
   <path transform="translate(.001 .736)" d="M495.1 432v247.3H290.3L495.1 432zm0-88.7c0 56.6-45.8 102.4-102.4 102.4s-102.4-45.8-102.4-102.4h204.8zm33.8 336c0-56.6 45.8-102.4 102.4-102.4s102.4 45.8 102.4 102.4H528.9zm0-88.8V343.3h204.8L528.9 590.5z" style="fill:#fff"/>
</svg>
`,

  intercom: `<!-- License: MIT. Made by edent: https://github.com/edent/SuperTinyIcons -->
<svg xmlns="http://www.w3.org/2000/svg"
aria-label="Intercom" role="img"
viewBox="0 0 512 512"><rect
width="512" height="512"
rx="15%"
fill="#0E24D1"/><path fill="#fff" d="M365 272a10 10 0 01-11 10 10 10 0 01-10-10v-91a10 10 0 0110-10c3 0 6 1 8 3s3 4 3 7v91zm-4 63c-1 2-39 33-108 33s-106-31-108-33a10 10 0 1113-15c1 1 34 28 95 28s95-28 95-28a10 10 0 0114 1 10 10 0 01-1 14zM142 181a10 10 0 0110-10 10 10 0 0110 10v91a10 10 0 01-10 10 10 10 0 01-10-10v-91zm50-20a10 10 0 0111-10 10 10 0 0110 10v135a10 10 0 01-11 10 10 10 0 01-10-10V161zm51-5a10 10 0 0110-10 10 10 0 0111 10v146a10 10 0 01-11 11 10 10 0 01-10-11V156zm51 5a10 10 0 0110-10 10 10 0 0110 10v135a10 10 0 01-10 10 10 10 0 01-10-10V161zm73-56H139a38 38 0 00-35 24c-2 4-3 9-3 14v228a38 38 0 0024 35c4 2 9 3 14 3h228a38 38 0 0035-24c2-4 3-9 3-14V143a38 38 0 00-23-35l-15-3"/></svg>`,

  salesforce: `<svg width="256px" height="256px" viewBox="0 -38 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
	<g>
		<path d="M106.553203,159.610976 C114.801129,168.204994 126.284107,173.534815 138.983873,173.534815 C155.865892,173.534815 170.594851,164.121105 178.438396,150.146262 C185.254593,153.191874 192.799405,154.885905 200.737669,154.885905 C231.186506,154.885905 255.871995,129.985475 255.871995,99.2706935 C255.871995,68.5522694 231.186506,43.651839 200.737669,43.651839 C197.021731,43.651839 193.389583,44.0234329 189.877657,44.7338328 C182.970383,32.4129469 169.807947,24.0885163 154.700107,24.0885163 C148.375726,24.0885163 142.393793,25.5493901 137.067615,28.1469039 C130.065621,11.6765534 113.751923,0.127999726 94.7387049,0.127999726 C74.9385822,0.127999726 58.0638501,12.6565411 51.5864595,30.2271008 C48.7557888,29.6259931 45.8231119,29.3126885 42.8139304,29.3126885 C19.23958,29.3126885 0.127998772,48.6209959 0.127998772,72.4430755 C0.127998772,88.4070383 8.71473094,102.34545 21.4727861,109.802829 C18.8461277,115.846693 17.3852539,122.517167 17.3852539,129.53009 C17.3852539,156.926028 39.6262381,179.134225 67.0586069,179.134225 C83.1646497,179.134225 97.4782987,171.476477 106.553203,159.610976" fill="#00A1E0" transform="translate(127.999997, 89.631112) scale(1, -1) translate(-127.999997, -89.631112) "></path>
		<path d="M37.1700744,75.3309413 C37.009779,74.9119875 37.2283636,74.8245536 37.2793667,74.7516921 C37.7602528,74.4019567 38.2484251,74.1505844 38.7402405,73.8700675 C41.3486835,72.4856983 43.8114035,72.0813168 46.3870588,72.0813168 C51.6330895,72.0813168 54.8900002,74.8719136 54.8900002,79.3638274 L54.8900002,79.4512613 C54.8900002,83.6043689 51.2141357,85.1126027 47.7641419,86.2018827 L47.3160434,86.3476058 C44.7148866,87.1927996 42.4707512,87.921415 42.4707512,89.6336611 L42.4707512,89.724738 C42.4707512,91.1892549 43.7822589,92.2676057 45.8150958,92.2676057 C48.0738034,92.2676057 50.755108,91.5171318 52.4819264,90.5626457 C52.4819264,90.5626457 52.9883141,90.2347688 53.174111,90.7265842 C53.2761172,90.9888857 54.1504556,93.3423133 54.2415326,93.5973287 C54.3398956,93.8742026 54.1650279,94.0782149 53.9865172,94.1875072 C52.0156126,95.3860795 49.2905911,96.2057718 46.4708496,96.2057718 L45.9462465,96.2021287 C41.1446712,96.2021287 37.7930405,93.3022395 37.7930405,89.1454888 L37.7930405,89.058055 C37.7930405,84.6754335 41.4907635,83.2546335 44.9553296,82.2637166 L45.5127204,82.092492 C48.0373727,81.3165166 50.2122895,80.6498336 50.2122895,78.872012 L50.2122895,78.7845782 C50.2122895,77.1597659 48.7987757,75.9502644 46.5182096,75.9502644 C45.6329419,75.9502644 42.8095574,75.9684798 39.760302,77.8956674 C39.3923513,78.110609 39.1774097,78.2672613 38.8932497,78.4384859 C38.7438836,78.5332059 38.3686467,78.6971444 38.2047082,78.2016859 L37.1700744,75.3309413 L37.1700744,75.3309413 Z" fill="#FFFFFF" transform="translate(46.001138, 84.143544) scale(1, -1) translate(-46.001138, -84.143544) "></path>
		<path d="M113.969779,75.3309413 C113.809484,74.9119875 114.028068,74.8245536 114.079072,74.7516921 C114.559958,74.4019567 115.04813,74.1505844 115.539945,73.8700675 C118.148388,72.4856983 120.611108,72.0813168 123.186764,72.0813168 C128.432794,72.0813168 131.689705,74.8719136 131.689705,79.3638274 L131.689705,79.4512613 C131.689705,83.6043689 128.013841,85.1126027 124.563847,86.2018827 L124.115748,86.3476058 C121.514591,87.1927996 119.270456,87.921415 119.270456,89.6336611 L119.270456,89.724738 C119.270456,91.1892549 120.581964,92.2676057 122.614801,92.2676057 C124.873508,92.2676057 127.554813,91.5171318 129.281631,90.5626457 C129.281631,90.5626457 129.788019,90.2347688 129.973816,90.7265842 C130.075822,90.9888857 130.95016,93.3423133 131.041237,93.5973287 C131.1396,93.8742026 130.964733,94.0782149 130.786222,94.1875072 C128.815317,95.3860795 126.090296,96.2057718 123.270554,96.2057718 L122.745951,96.2021287 C117.944376,96.2021287 114.592745,93.3022395 114.592745,89.1454888 L114.592745,89.058055 C114.592745,84.6754335 118.290468,83.2546335 121.755034,82.2637166 L122.312425,82.092492 C124.837077,81.3165166 127.015637,80.6498336 127.015637,78.872012 L127.015637,78.7845782 C127.015637,77.1597659 125.598481,75.9502644 123.317914,75.9502644 C122.432647,75.9502644 119.609262,75.9684798 116.560007,77.8956674 C116.192056,78.110609 115.973471,78.2599751 115.696598,78.4384859 C115.601878,78.5004182 115.157422,78.6716428 115.004413,78.2016859 L113.969779,75.3309413 L113.969779,75.3309413 Z" fill="#FFFFFF" transform="translate(122.800843, 84.143544) scale(1, -1) translate(-122.800843, -84.143544) "></path>
		<path d="M166.398769,84.1136744 C166.398769,81.5744499 165.925169,79.5744007 164.992541,78.1608868 C164.070843,76.7619453 162.675544,76.08069 160.730141,76.08069 C158.781095,76.08069 157.393083,76.7583022 156.485956,78.1608868 C155.567901,79.5707576 155.101587,81.5744499 155.101587,84.1136744 C155.101587,86.6492559 155.567901,88.6456621 156.485956,90.0446036 C157.393083,91.4289728 158.781095,92.102942 160.730141,92.102942 C162.675544,92.102942 164.070843,91.4289728 164.996184,90.0446036 C165.925169,88.6456621 166.398769,86.6492559 166.398769,84.1136744 M170.777747,88.8205297 C170.347864,90.2741174 169.677538,91.5564805 168.784984,92.623902 C167.89243,93.6949666 166.763076,94.5547327 165.422424,95.181342 C164.085415,95.8043081 162.504319,96.1212558 160.730141,96.1212558 C158.95232,96.1212558 157.371224,95.8043081 156.034215,95.181342 C154.693563,94.5547327 153.564209,93.6949666 152.668012,92.623902 C151.779101,91.5528374 151.108775,90.2704743 150.675249,88.8205297 C150.249009,87.3742282 150.034067,85.7931329 150.034067,84.1136744 C150.034067,82.434216 150.249009,80.8494776 150.675249,79.4068191 C151.108775,77.9568745 151.775458,76.6745115 152.671655,75.6034469 C153.564209,74.5323823 154.697206,73.6762592 156.034215,73.0678654 C157.374867,72.4594715 158.95232,72.14981 160.730141,72.14981 C162.504319,72.14981 164.081772,72.4594715 165.422424,73.0678654 C166.759433,73.6762592 167.89243,74.5323823 168.784984,75.6034469 C169.677538,76.6708684 170.347864,77.9532315 170.777747,79.4068191 C171.20763,80.8531206 171.422572,82.4378591 171.422572,84.1136744 C171.422572,85.7894898 171.20763,87.3742282 170.777747,88.8205297" fill="#FFFFFF" transform="translate(160.728320, 84.135533) scale(1, -1) translate(-160.728320, -84.135533) "></path>
		<path d="M206.737482,76.7251427 C206.591759,77.1513827 206.180091,76.9910873 206.180091,76.9910873 C205.542553,76.7470012 204.864941,76.5211304 204.143612,76.408195 C203.411353,76.2952596 202.606233,76.2369704 201.742824,76.2369704 C199.622553,76.2369704 197.939452,76.8672227 196.733593,78.113155 C195.524092,79.3590873 194.846479,81.3737088 194.853766,84.0987303 C194.861052,86.5796656 195.458516,88.444921 196.533224,89.8657209 C197.600645,91.2792348 199.225458,92.0042071 201.393088,92.0042071 C203.200055,92.0042071 204.577138,91.7965517 206.019796,91.3411671 C206.019796,91.3411671 206.365888,91.1918009 206.529827,91.6435424 C206.91235,92.7073209 207.19651,93.468724 207.604535,94.6381516 C207.721113,94.9696716 207.436953,95.1117516 207.334947,95.1518255 C206.766627,95.3740532 205.425975,95.7347178 204.413199,95.887727 C203.465999,96.0334501 202.358504,96.1099547 201.127144,96.1099547 C199.28739,96.1099547 197.648005,95.7966501 196.245421,95.1700409 C194.846479,94.5470747 193.658836,93.6873086 192.718922,92.616244 C191.779009,91.5451794 191.064966,90.2628163 190.587723,88.8128717 C190.114123,87.3665702 189.873679,85.7781887 189.873679,84.0987303 C189.873679,80.4665826 190.853667,77.5302627 192.788141,75.3808473 C194.726258,73.2241458 197.637076,72.1275797 201.433162,72.1275797 C203.677298,72.1275797 205.979722,72.5829643 207.633679,73.2350751 C207.633679,73.2350751 207.950627,73.3880843 207.81219,73.756035 L206.737482,76.7251427 L206.737482,76.7251427 Z" fill="#FFFFFF" transform="translate(198.860433, 84.118767) scale(1, -1) translate(-198.860433, -84.118767) "></path>
		<path d="M214.399204,86.5520198 C214.606859,87.9618906 214.996668,89.1349613 215.597776,90.0493736 C216.504902,91.4373859 217.889271,92.198789 219.834675,92.198789 C221.780078,92.198789 223.066084,91.4337428 223.987782,90.0493736 C224.599819,89.1349613 224.865764,87.9108875 224.971413,86.5520198 L214.399204,86.5520198 L214.399204,86.5520198 Z M229.142736,89.6522783 C228.771142,91.0548629 227.849444,92.4720198 227.244693,93.1204874 C226.290207,94.1478351 225.357579,94.8655213 224.432238,95.2662597 C223.222736,95.7835766 221.772791,96.1260258 220.18441,96.1260258 C218.333727,96.1260258 216.654268,95.8163643 215.291758,95.1751828 C213.925604,94.5340013 212.778035,93.6596628 211.878195,92.5703828 C210.978355,91.4847459 210.300742,90.1914536 209.870859,88.7232937 C209.437333,87.2624198 209.218749,85.6703952 209.218749,83.9909368 C209.218749,82.2823338 209.444619,80.6903092 209.892718,79.25858 C210.344459,77.8159215 211.065789,76.5444877 212.042133,75.4916385 C213.014835,74.4315031 214.268053,73.6008816 215.769001,73.0216324 C217.259019,72.4460262 219.069628,72.1472939 221.149825,72.150937 C225.430441,72.1655093 227.685505,73.1199955 228.61449,73.6336693 C228.778428,73.7247462 228.935081,73.8850416 228.738354,74.3440693 L227.769296,77.0581615 C227.623573,77.4625431 227.211905,77.3131769 227.211905,77.3131769 C226.15177,76.9197246 224.643536,76.2129677 221.127967,76.2202539 C218.829185,76.2238969 217.124225,76.9015092 216.056804,77.9616446 C214.960238,79.0472815 214.424705,80.6429492 214.329985,82.8943707 L229.153665,82.8797984 C229.153665,82.8797984 229.543474,82.8870845 229.583548,83.2659645 C229.598121,83.4262599 230.093579,86.3115768 229.142736,89.6522783 L229.142736,89.6522783 Z" fill="#FFFFFF" transform="translate(219.472103, 84.138465) scale(1, -1) translate(-219.472103, -84.138465) "></path>
		<path d="M95.6829901,86.5520198 C95.8942885,87.9618906 96.2804547,89.1349613 96.8815624,90.0493736 C97.7886885,91.4373859 99.1730577,92.198789 101.118461,92.198789 C103.063864,92.198789 104.34987,91.4337428 105.275211,90.0493736 C105.883605,89.1349613 106.14955,87.9108875 106.255199,86.5520198 L95.6829901,86.5520198 L95.6829901,86.5520198 Z M110.422879,89.6522783 C110.051285,91.0548629 109.13323,92.4720198 108.528479,93.1204874 C107.573993,94.1478351 106.641365,94.8655213 105.716024,95.2662597 C104.506522,95.7835766 103.056578,96.1260258 101.468196,96.1260258 C99.6211562,96.1260258 97.9380547,95.8163643 96.5755439,95.1751828 C95.2093901,94.5340013 94.0618209,93.6596628 93.1619809,92.5703828 C92.2621409,91.4847459 91.5845286,90.1914536 91.1546455,88.7232937 C90.7247625,87.2624198 90.5025348,85.6703952 90.5025348,83.9909368 C90.5025348,82.2823338 90.7284055,80.6903092 91.176504,79.25858 C91.6282455,77.8159215 92.3495747,76.5444877 93.3259193,75.4916385 C94.2986209,74.4315031 95.5518393,73.6008816 97.052787,73.0216324 C98.5428054,72.4460262 100.353415,72.1472939 102.433612,72.150937 C106.714227,72.1655093 108.969291,73.1199955 109.898276,73.6336693 C110.062214,73.7247462 110.218867,73.8850416 110.022141,74.3440693 L109.056725,77.0581615 C108.907359,77.4625431 108.495691,77.3131769 108.495691,77.3131769 C107.435556,76.9197246 105.930965,76.2129677 102.40811,76.2202539 C100.112972,76.2238969 98.4080116,76.9015092 97.3405901,77.9616446 C96.2440239,79.0472815 95.7084916,80.6429492 95.6137716,82.8943707 L110.437451,82.8797984 C110.437451,82.8797984 110.827261,82.8870845 110.867334,83.2659645 C110.881907,83.4262599 111.377365,86.3115768 110.422879,89.6522783 L110.422879,89.6522783 Z" fill="#FFFFFF" transform="translate(100.755643, 84.138465) scale(1, -1) translate(-100.755643, -84.138465) "></path>
		<path d="M63.6417638,76.8187739 C63.0625146,77.2814447 62.9823669,77.3980231 62.7856408,77.6967554 C62.4941946,78.15214 62.3448285,78.8006077 62.3448285,79.6239431 C62.3448285,80.9281646 62.7747115,81.8644354 63.6672654,82.4946877 C63.6563361,82.4910446 64.9423423,83.6058261 67.9660961,83.5657523 C70.0900099,83.5366076 71.9880529,83.223303 71.9880529,83.223303 L71.9880529,76.4836108 L71.991696,76.4836108 C71.991696,76.4836108 70.1082253,76.0792293 67.9879545,75.9517216 C64.9714869,75.7695678 63.6308346,76.822417 63.6417638,76.8187739 M69.5399053,87.2343307 C68.9387976,87.2780476 68.1591792,87.3035491 67.2265515,87.3035491 C65.9551176,87.3035491 64.7274007,87.1432537 63.5761885,86.8335922 C62.41769,86.5239307 61.37577,86.0394014 60.4795731,85.3982199 C59.5797331,84.7533953 58.8547608,83.9300599 58.3301578,82.9537153 C57.8055547,81.9773707 57.5396101,80.8261584 57.5396101,79.5365092 C57.5396101,78.2250016 57.7654809,77.0847185 58.2172224,76.1520908 C58.6689639,75.2158201 59.3210747,74.4362016 60.1516962,73.8350939 C60.9750316,73.2339863 61.99145,72.793174 63.1718069,72.5272294 C64.3339484,72.2612847 65.6527423,72.1264909 67.0954007,72.1264909 C68.6145638,72.1264909 70.1300837,72.2503555 71.5982437,72.5017278 C73.0518314,72.749457 74.836939,73.1101217 75.3323975,73.223057 C75.8242129,73.3396355 76.3706744,73.4890016 76.3706744,73.4890016 C76.7386252,73.5800786 76.7094806,73.9735309 76.7094806,73.9735309 L76.7021944,87.5294199 C76.7021944,90.5021706 75.9080036,92.7062321 74.3451237,94.0723859 C72.7895298,95.4348967 70.4980345,96.1234382 67.536213,96.1234382 C66.4250746,96.1234382 64.6363238,95.970429 63.5652592,95.7554874 C63.5652592,95.7554874 60.3265639,95.1288782 58.9931978,94.0869582 C58.9931978,94.0869582 58.7017516,93.9048044 58.862047,93.4967798 L59.9112531,90.6770383 C60.0424039,90.3127306 60.3957824,90.4365952 60.3957824,90.4365952 C60.3957824,90.4365952 60.5087177,90.4803121 60.6398685,90.5568168 C63.4923977,92.1087675 67.0990438,92.0614075 67.0990438,92.0614075 C68.7019976,92.0614075 69.9333576,91.7408167 70.7639791,91.1032783 C71.5727422,90.4839552 71.9844099,89.5476845 71.9844099,87.5731368 L71.9844099,86.9465276 C70.709333,87.1286814 69.5399053,87.2343307 69.5399053,87.2343307" fill="#FFFFFF" transform="translate(67.124818, 84.124965) scale(1, -1) translate(-67.124818, -84.124965) "></path>
		<path d="M189.099133,94.6589745 C189.212069,94.9941376 188.975269,95.1544329 188.876906,95.1908637 C188.625533,95.2892268 187.365029,95.5551714 186.392327,95.6171037 C184.530715,95.7300391 183.496081,95.4167345 182.57074,95.0014237 C181.652684,94.586113 180.632623,93.9157868 180.064303,93.1543837 L180.064303,94.9577068 C180.064303,95.2090791 179.885792,95.4094483 179.638063,95.4094483 L175.838334,95.4094483 C175.590604,95.4094483 175.412094,95.2090791 175.412094,94.9577068 L175.412094,72.8478733 C175.412094,72.6001441 175.616106,72.3961318 175.863835,72.3961318 L179.758284,72.3961318 C180.006014,72.3961318 180.206383,72.6001441 180.206383,72.8478733 L180.206383,83.8936824 C180.206383,85.3764146 180.370321,86.8555038 180.698198,87.7844884 C181.018789,88.7025438 181.455958,89.4384453 181.995134,89.9666915 C182.537952,90.4912946 183.153632,90.8592453 183.827601,91.0669007 C184.516143,91.2781992 185.277546,91.3474176 185.816721,91.3474176 C186.592697,91.3474176 187.445177,91.1470484 187.445177,91.1470484 C187.729337,91.1142607 187.889632,91.2891284 187.984352,91.5477868 C188.239367,92.2253991 188.960697,94.254593 189.099133,94.6589745" fill="#FFFFFF" transform="translate(182.270544, 84.018248) scale(1, -1) translate(-182.270544, -84.018248) "></path>
		<path d="M152.543767,105.761574 C152.070167,105.907297 151.640284,106.00566 151.07925,106.111309 C150.51093,106.213316 149.833318,106.264319 149.064629,106.264319 C146.383324,106.264319 144.270339,105.506559 142.787607,104.012897 C141.312161,102.526522 140.310315,100.264171 139.80757,97.2877773 L139.625416,96.2859312 L136.259213,96.2859312 C136.259213,96.2859312 135.851189,96.3005035 135.763755,95.8560481 L135.21365,92.770362 C135.173577,92.4789159 135.301084,92.2931189 135.694537,92.2931189 L138.969663,92.2931189 L135.647177,73.7425715 C135.388518,72.24891 135.089786,71.0211931 134.758266,70.0885655 C134.434032,69.1705101 134.117084,68.4819686 133.723632,67.9792239 C133.344752,67.4983378 132.98773,67.1413163 132.368407,66.9336609 C131.858377,66.7624363 131.268198,66.6822886 130.623374,66.6822886 C130.266352,66.6822886 129.789109,66.7405778 129.43573,66.8134393 C129.085995,66.8826578 128.900198,66.9591624 128.634254,67.0720978 C128.634254,67.0720978 128.251731,67.2178209 128.098721,66.8352978 C127.9785,66.5183501 127.104161,64.1175625 126.998512,63.8224732 C126.896506,63.527384 127.042229,63.2978702 127.228026,63.2286517 C127.665195,63.0756425 127.989429,62.9736363 128.583251,62.8315563 C129.406586,62.6384733 130.102414,62.627544 130.754524,62.627544 C132.117035,62.627544 133.362967,62.8206271 134.393958,63.1922209 C135.428592,63.5674579 136.332075,64.2195686 137.133552,65.1011932 C137.996961,66.0556794 138.53978,67.0538824 139.057096,68.4200362 C139.57077,69.7679747 140.011583,71.44379 140.361318,73.3964792 L143.702019,92.2931189 L148.583742,92.2931189 C148.583742,92.2931189 148.99541,92.2785466 149.079201,92.7266451 L149.632949,95.8086881 C149.669379,96.1037773 149.545515,96.2859312 149.148419,96.2859312 L144.408776,96.2859312 C144.434278,96.3915804 144.649219,98.0601096 145.192038,99.6302757 C145.425195,100.296959 145.862364,100.839777 146.230315,101.211371 C146.594623,101.575679 147.013576,101.834337 147.472604,101.983703 C147.942561,102.136713 148.478093,102.209574 149.064629,102.209574 C149.509084,102.209574 149.949896,102.158571 150.281416,102.089353 C150.740444,101.99099 150.918955,101.939986 151.039176,101.903556 C151.523706,101.757833 151.589281,101.899913 151.684001,102.13307 L152.816998,105.244257 C152.933576,105.57942 152.645773,105.7215 152.543767,105.761574" fill="#FFFFFF" transform="translate(139.904621, 84.445931) scale(1, -1) translate(-139.904621, -84.445931) "></path>
		<path d="M86.3217408,63.553237 C86.3217408,63.3055078 86.14323,63.1051385 85.8955008,63.1051385 L81.9646209,63.1051385 C81.7168916,63.1051385 81.542024,63.3055078 81.542024,63.553237 L81.542024,95.1897165 C81.542024,95.4374457 81.7168916,95.6378149 81.9646209,95.6378149 L85.8955008,95.6378149 C86.14323,95.6378149 86.3217408,95.4374457 86.3217408,95.1897165 L86.3217408,63.553237 L86.3217408,63.553237 Z" fill="#FFFFFF" transform="translate(83.931882, 79.371477) scale(1, -1) translate(-83.931882, -79.371477) "></path>
	</g>
</svg>`,

  hubspot: `<svg width="1024px" height="1024px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
   <circle cx="512" cy="512" r="512" style="fill:#ff7a59"/>
   <path d="M623.8 624.94c-38.23 0-69.24-30.67-69.24-68.51s31-68.52 69.24-68.52 69.26 30.67 69.26 68.52-31 68.51-69.26 68.51m20.74-200.42v-61a46.83 46.83 0 0 0 27.33-42.29v-1.41c0-25.78-21.32-46.86-47.35-46.86h-1.43c-26 0-47.35 21.09-47.35 46.86v1.41a46.85 46.85 0 0 0 27.33 42.29v61a135.08 135.08 0 0 0-63.86 27.79l-169.1-130.17A52.49 52.49 0 0 0 372 309c0-29.21-23.89-52.92-53.4-53s-53.45 23.59-53.48 52.81 23.85 52.88 53.36 52.93a53.29 53.29 0 0 0 26.33-7.09l166.38 128.1a132.14 132.14 0 0 0 2.07 150.3l-50.62 50.1A43.42 43.42 0 1 0 450.1 768c24.24 0 43.9-19.46 43.9-43.45a42.24 42.24 0 0 0-2-12.42l50-49.52a135.28 135.28 0 0 0 81.8 27.47c74.61 0 135.06-59.83 135.06-133.65 0-66.82-49.62-122-114.33-131.91" style="fill:#fff;fill-rule:evenodd"/>
</svg>
`,

  slack: `<<!-- License: Apache. Made by grommet: https://github.com/grommet/grommet-icons -->
<svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" fill-rule="evenodd">
    <path fill="#E01E5A" d="M5.04765714 15.1238095C5.04765714 16.5142857 3.92384762 17.6380952 2.53337143 17.6380952 1.14289524 17.6380952.0190857143 16.5142857.0190857143 15.1238095.0190857143 13.7333333 1.14289524 12.6095238 2.53337143 12.6095238L5.04765714 12.6095238 5.04765714 15.1238095zM6.30472381 15.1238095C6.30472381 13.7333333 7.42853333 12.6095238 8.81900952 12.6095238 10.2094857 12.6095238 11.3332952 13.7333333 11.3332952 15.1238095L11.3332952 21.4095238C11.3332952 22.8 10.2094857 23.9238095 8.81900952 23.9238095 7.42853333 23.9238095 6.30472381 22.8 6.30472381 21.4095238L6.30472381 15.1238095z"/>
    <path fill="#36C5F0" d="M8.81904762 5.02857143C7.42857143 5.02857143 6.3047619 3.9047619 6.3047619 2.51428571 6.3047619 1.12380952 7.42857143 0 8.81904762 0 10.2095238 0 11.3333333 1.12380952 11.3333333 2.51428571L11.3333333 5.02857143 8.81904762 5.02857143zM8.81904762 6.3048C10.2095238 6.3048 11.3333333 7.42860952 11.3333333 8.81908571 11.3333333 10.2095619 10.2095238 11.3333714 8.81904762 11.3333714L2.51428571 11.3333714C1.12380952 11.3333714 0 10.2095619 0 8.81908571 0 7.42860952 1.12380952 6.3048 2.51428571 6.3048L8.81904762 6.3048z"/>
    <path fill="#2EB67D" d="M18.895219 8.81902857C18.895219 7.42855238 20.0190286 6.30474286 21.4095048 6.30474286 22.799981 6.30474286 23.9237905 7.42855238 23.9237905 8.81902857 23.9237905 10.2095048 22.799981 11.3333143 21.4095048 11.3333143L18.895219 11.3333143 18.895219 8.81902857zM17.6380571 8.81902857C17.6380571 10.2095048 16.5142476 11.3333143 15.1237714 11.3333143 13.7332952 11.3333143 12.6094857 10.2095048 12.6094857 8.81902857L12.6094857 2.51426667C12.6094857 1.12379048 13.7332952-.0000190476191 15.1237714-.0000190476191 16.5142476-.0000190476191 17.6380571 1.12379048 17.6380571 2.51426667L17.6380571 8.81902857z"/>
    <path fill="#ECB22E" d="M15.1238286 18.8952C16.5143048 18.8952 17.6381143 20.0190095 17.6381143 21.4094857 17.6381143 22.7999619 16.5143048 23.9237714 15.1238286 23.9237714 13.7333524 23.9237714 12.6095429 22.7999619 12.6095429 21.4094857L12.6095429 18.8952 15.1238286 18.8952zM15.1238286 17.6381333C13.7333524 17.6381333 12.6095429 16.5143238 12.6095429 15.1238476 12.6095429 13.7333714 13.7333524 12.6095619 15.1238286 12.6095619L21.4285905 12.6095619C22.8190667 12.6095619 23.9428762 13.7333714 23.9428762 15.1238476 23.9428762 16.5143238 22.8190667 17.6381333 21.4285905 17.6381333L15.1238286 17.6381333z"/>
  </g>
</svg>
`,
};

/**
 * Renders an SVG string into an HTMLImageElement via a Blob URL.
 * Zero CORS issues — everything is local.
 */
function svgToImage(svgString) {
  return new Promise(resolve => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── ArcballControl ──────────────────────────────────────────────────────────
class ArcballControl {
  isPointerDown = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis = vec3.fromValues(1, 0, 0);
  snapDirection = vec3.fromValues(0, 0, -1);
  snapTargetDirection;
  EPSILON = 0.1;
  IDENTITY_QUAT = quat.create();

  constructor(canvas, updateCallback) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => null);
    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();

    canvas.addEventListener('pointerdown', e => {
      vec2.set(this.pointerPos, e.clientX, e.clientY);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
    });
    canvas.addEventListener('pointerup', () => { this.isPointerDown = false; });
    canvas.addEventListener('pointerleave', () => { this.isPointerDown = false; });
    canvas.addEventListener('pointermove', e => {
      if (this.isPointerDown) vec2.set(this.pointerPos, e.clientX, e.clientY);
    });
    canvas.style.touchAction = 'none';
  }

  update(deltaTime, targetFrameDuration = 16) {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    let snapRotation = quat.create();

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;
      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);
      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        const p = this.#project(midPointerPos);
        const q = this.#project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }

    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;
    this.updateCallback(deltaTime);
  }

  quatFromVectors(a, b, out, angleFactor = 1) {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
    return { q: out, axis, angle };
  }

  #project(pos) {
    const r = 2;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;
    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;
    if (xySq <= rSq / 2.0) z = Math.sqrt(rSq - xySq);
    else z = rSq / Math.sqrt(xySq);
    return vec3.fromValues(-x, y, z);
  }
}

// ─── InfiniteGridMenu ────────────────────────────────────────────────────────
class InfiniteGridMenu {
  TARGET_FRAME_DURATION = 1000 / 60;
  SPHERE_RADIUS = 2;

  #time = 0;
  #deltaTime = 0;
  #deltaFrames = 0;
  #frames = 0;

  camera = {
    matrix: mat4.create(),
    near: 0.1,
    far: 40,
    fov: Math.PI / 4,
    aspect: 1,
    position: vec3.fromValues(0, 0, 3),
    up: vec3.fromValues(0, 1, 0),
    matrices: {
      view: mat4.create(),
      projection: mat4.create(),
      inversProjection: mat4.create()
    }
  };

  nearestVertexIndex = null;
  smoothRotationVelocity = 0;
  scaleFactor = 1.0;
  movementActive = false;

  constructor(canvas, items, onActiveItemChange, onMovementChange, onInit = null, scale = 1.0) {
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || (() => {});
    this.onMovementChange = onMovementChange || (() => {});
    this.scaleFactor = scale;
    this.camera.position[2] = 3 * scale;
    this.#init(onInit);
  }

  resize() {
    this.viewportSize = vec2.set(
      this.viewportSize || vec2.create(),
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    const gl = this.gl;
    const needsResize = resizeCanvasToDisplaySize(gl.canvas);
    if (needsResize) gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.#updateProjectionMatrix(gl);
  }

  run(time = 0) {
    this.#deltaTime = Math.min(32, time - this.#time);
    this.#time = time;
    this.#deltaFrames = this.#deltaTime / this.TARGET_FRAME_DURATION;
    this.#frames += this.#deltaFrames;
    this.#animate(this.#deltaTime);
    this.#render();
    requestAnimationFrame(t => this.run(t));
  }

  #init(onInit) {
    // alpha: true so the canvas background is transparent → blends with page bg
    this.gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true });
    const gl = this.gl;
    if (!gl) throw new Error('No WebGL 2 context!');

    const dpr = Math.min(2, window.devicePixelRatio);
    const displayWidth = Math.round(this.canvas.clientWidth * dpr);
    const displayHeight = Math.round(this.canvas.clientHeight * dpr);
    this.canvas.width = displayWidth;
    this.canvas.height = displayHeight;
    gl.viewport(0, 0, displayWidth, displayHeight);

    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBufferSize = vec2.clone(this.viewportSize);

    this.discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], null, {
      aModelPosition: 0,
      aModelNormal: 1,
      aModelUvs: 2,
      aInstanceMatrix: 3
    });

    this.discLocations = {
      aModelPosition: gl.getAttribLocation(this.discProgram, 'aModelPosition'),
      aModelUvs: gl.getAttribLocation(this.discProgram, 'aModelUvs'),
      aInstanceMatrix: gl.getAttribLocation(this.discProgram, 'aInstanceMatrix'),
      uWorldMatrix: gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix: gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition: gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uScaleFactor: gl.getUniformLocation(this.discProgram, 'uScaleFactor'),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex: gl.getUniformLocation(this.discProgram, 'uTex'),
      uFrames: gl.getUniformLocation(this.discProgram, 'uFrames'),
      uItemCount: gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize: gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };

    this.discGeo = new DiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(
      gl,
      [
        [makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW), this.discLocations.aModelPosition, 3],
        [makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW), this.discLocations.aModelUvs, 2]
      ],
      this.discBuffers.indices
    );

    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(v => v.position);
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;
    this.#initDiscInstances(this.DISC_INSTANCE_COUNT);

    this.worldMatrix = mat4.create();
    this.#initTexture();

    this.control = new ArcballControl(this.canvas, deltaTime => this.#onControlUpdate(deltaTime));
    this.#updateCameraMatrix();
    this.#updateProjectionMatrix(gl);
    this.resize();

    if (onInit) onInit(this);
  }

  #initTexture() {
    const gl = this.gl;
    this.tex = createAndSetupTexture(gl, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const atlasCanvas = document.createElement('canvas');
    const ctx = atlasCanvas.getContext('2d');
    const cellSize = 512;
    atlasCanvas.width = this.atlasSize * cellSize;
    atlasCanvas.height = this.atlasSize * cellSize;

    // Fallback colour palette — matches the section's indigo/teal accent palette
    const fallbackColors = ['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e', '#0e2954'];

    const createAtlas = images => {
      images.forEach((img, i) => {
        const x = (i % this.atlasSize) * cellSize;
        const y = Math.floor(i / this.atlasSize) * cellSize;

        // Draw rounded-rect card background first
        const r = 48;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + cellSize - r, y);
        ctx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + r);
        ctx.lineTo(x + cellSize, y + cellSize - r);
        ctx.quadraticCurveTo(x + cellSize, y + cellSize, x + cellSize - r, y + cellSize);
        ctx.lineTo(x + r, y + cellSize);
        ctx.quadraticCurveTo(x, y + cellSize, x, y + cellSize - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        if (img && img.width > 0 && img.height > 0) {
          // White card bg for logos
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          // Centered image with padding
          const pad = 72;
          const drawSize = cellSize - pad * 2;
          const aspect = img.width / img.height;
          let dw = drawSize, dh = drawSize;
          if (aspect > 1) dh = dw / aspect;
          else dw = dh * aspect;
          const dx = x + pad + (drawSize - dw) / 2;
          const dy = y + pad + (drawSize - dh) / 2;
          ctx.save();
          ctx.clip();
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        } else {
          // Stylish fallback: gradient + brand name
          const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
          const base = fallbackColors[i % fallbackColors.length];
          grad.addColorStop(0, base);
          grad.addColorStop(1, '#3a86ff');
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.beginPath();
          ctx.arc(x + cellSize * 0.72, y + cellSize * 0.28, 160, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 64px "DM Serif Display", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const title = this.items[i]?.title || '';
          const letter = title.charAt(0).toUpperCase();
          ctx.fillText(letter, x + cellSize / 2, y + cellSize / 2 - 20);

          ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.fillText(title, x + cellSize / 2, y + cellSize / 2 + 52);
        }
      });

      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    };

    // Use inline SVG logos → resolve via blob URLs (no CORS)
    const logoKeys = ['zendesk', 'intercom', 'salesforce', 'hubspot', 'slack'];

    Promise.all(
      this.items.map((item, idx) => {
        // Check if a known inline SVG exists for this item (matched by title)
        const key = item.title?.toLowerCase();
        if (LOGO_SVGS[key]) return svgToImage(LOGO_SVGS[key]);

        // Fallback: try loading item.image (may still work if CORS-friendly)
        return new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          setTimeout(() => { if (!img.complete) resolve(null); }, 3000);
          img.src = item.image;
        });
      })
    ).then(createAtlas).catch(() => createAtlas(new Array(itemCount).fill(null)));
  }

  #initDiscInstances(count) {
    const gl = this.gl;
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [],
      buffer: gl.createBuffer()
    };
    for (let i = 0; i < count; ++i) {
      const instanceMatrixArray = new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16);
      instanceMatrixArray.set(mat4.create());
      this.discInstances.matrices.push(instanceMatrixArray);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    const bytesPerMatrix = 16 * 4;
    for (let j = 0; j < 4; ++j) {
      const loc = this.discLocations.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  #animate(deltaTime) {
    const gl = this.gl;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    const scale = 0.25;
    const SCALE_INTENSITY = 0.6;
    this.instancePositions
      .map(p => vec3.transformQuat(vec3.create(), p, this.control.orientation))
      .forEach((p, ndx) => {
        const s = (Math.abs(p[2]) / this.SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
        const finalScale = s * scale;
        const matrix = mat4.create();
        mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
        mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
        mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
        mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));
        mat4.copy(this.discInstances.matrices[ndx], matrix);
      });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  #render() {
    const gl = this.gl;
    gl.useProgram(this.discProgram);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Transparent clear — canvas blends with CSS background
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Premultiplied alpha blending for correct transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(this.discLocations.uCameraPosition, ...this.camera.position);
    gl.uniform4f(
      this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1
    );
    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    gl.uniform1f(this.discLocations.uFrames, this.#frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);

    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(gl.TRIANGLES, this.discBuffers.indices.length, gl.UNSIGNED_SHORT, 0, this.DISC_INSTANCE_COUNT);
  }

  #updateCameraMatrix() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  #updateProjectionMatrix(gl) {
    this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const height = this.SPHERE_RADIUS * 0.35;
    const distance = this.camera.position[2];
    this.camera.fov = this.camera.aspect > 1
      ? 2 * Math.atan(height / distance)
      : 2 * Math.atan(height / this.camera.aspect / distance);
    mat4.perspective(this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  }

  #onControlUpdate(deltaTime) {
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;

    const isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;
    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }

    if (!this.control.isPointerDown) {
      const nearestVertexIndex = this.#findNearestVertexIndex();
      const itemIndex = nearestVertexIndex % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIndex);
      const snapDirection = vec3.normalize(vec3.create(), this.#getVertexWorldPosition(nearestVertexIndex));
      this.control.snapTargetDirection = snapDirection;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }

    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this.#updateCameraMatrix();
  }

  #findNearestVertexIndex() {
    const n = this.control.snapDirection;
    const inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    const nt = vec3.transformQuat(vec3.create(), n, inversOrientation);
    let maxD = -1, nearestVertexIndex;
    for (let i = 0; i < this.instancePositions.length; ++i) {
      const d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) { maxD = d; nearestVertexIndex = i; }
    }
    return nearestVertexIndex;
  }

  #getVertexWorldPosition(index) {
    return vec3.transformQuat(vec3.create(), this.instancePositions[index], this.control.orientation);
  }
}

// ─── React component ─────────────────────────────────────────────────────────
const defaultItems = [{
  image: 'https://picsum.photos/900/900?grayscale',
  link: 'https://google.com/',
  title: 'Demo',
  description: ''
}];

export default function InfiniteMenu({ items = [], scale = 1.0 }) {
  const canvasRef = useRef(null);
  const [activeItem, setActiveItem] = useState(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    let sketch, handleResize;

    const handleActiveItem = index => {
      const itemIndex = index % items.length;
      setActiveItem(items[itemIndex]);
    };

    if (canvas) {
      const initTimer = setTimeout(() => {
        sketch = new InfiniteGridMenu(
          canvas,
          items.length ? items : defaultItems,
          handleActiveItem,
          setIsMoving,
          sk => { sk.run(); },
          scale
        );
        handleResize = () => { if (sketch) sketch.resize(); };
        window.addEventListener('resize', handleResize);
        handleResize();
      }, 0);

      return () => {
        clearTimeout(initTimer);
        if (handleResize) window.removeEventListener('resize', handleResize);
      };
    }
  }, [items, scale]);

  const handleButtonClick = () => {
    if (!activeItem?.link) return;
    if (activeItem.link.startsWith('http')) window.open(activeItem.link, '_blank');
  };

  return (
    <div className="infinite-menu-root">
      <canvas ref={canvasRef} className="infinite-menu-canvas" />

      {activeItem && (
        <>
          <h2 className={`face-title ${isMoving ? 'inactive' : 'active'}`}>
            {activeItem.title}
          </h2>
          <p className={`face-description ${isMoving ? 'inactive' : 'active'}`}>
            {activeItem.description}
          </p>
          <div
            onClick={handleButtonClick}
            className={`action-button ${isMoving ? 'inactive' : 'active'}`}
          >
            <span className="action-button-icon">&#x2197;</span>
          </div>
        </>
      )}
    </div>
  );
}
