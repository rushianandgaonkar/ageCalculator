/* Ageason hero — soft WebGL waves with a CSS-gradient fallback.
   No React, external packages, analytics or third-party asset requests.
   Render only while visible; pause in background and honor reduced motion. */
(function () {
  "use strict";
  var canvas = document.querySelector("[data-hero-shader]");
  if (!canvas || !window.requestAnimationFrame) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  if (reduce || saveData) return;
  var gl;
  try {
    gl = canvas.getContext("webgl", {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, powerPreference: "low-power"
    });
  } catch (_) { return; }
  if (!gl) return;

  var vertex = [
    "attribute vec2 aPosition;",
    "void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }"
  ].join("\n");
  var fragment = [
    "precision mediump float;",
    "uniform vec2 iResolution;",
    "uniform float iTime;",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / iResolution;",
    "  vec3 color = mix(vec3(0.91,0.94,1.0), vec3(1.0,0.91,0.95), uv.x);",
    "  float grid = (1.0-smoothstep(0.0,0.03,abs(sin(uv.x*22.0)))) * 0.012;",
    "  grid += (1.0-smoothstep(0.0,0.03,abs(sin(uv.y*18.0)))) * 0.01;",
    "  color -= vec3(grid);",
    "  for (int i=0; i<9; i++) {",
    "    float fi = float(i);",
    "    float wave = 0.52 + (fi-4.0)*0.046",
    "      + 0.062*sin(uv.x*7.7+iTime*0.23+fi*0.66)",
    "      + 0.021*sin(uv.x*16.0-iTime*0.13+fi*0.8);",
    "    float d = abs(uv.y-wave);",
    "    float line = 1.0-smoothstep(0.0015, 0.009, d);",
    "    float fade = smoothstep(0.01, 0.22, uv.x)*(1.0-smoothstep(0.80, 1.0, uv.x));",
    "    vec3 tint = mix(vec3(0.56,0.63,0.96), vec3(0.82,0.58,0.9), fi/8.0);",
    "    color = mix(color, tint, line*fade*0.42);",
    "  }",
    "  gl_FragColor = vec4(color, 1.0);",
    "}"
  ].join("\n");

  function compile(type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  var vs = compile(gl.VERTEX_SHADER, vertex);
  var fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return;
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return;
  }
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1, 1,-1, -1,1, 1,1
  ]), gl.STATIC_DRAW);
  var attr = gl.getAttribLocation(program, "aPosition");
  var res = gl.getUniformLocation(program, "iResolution");
  var time = gl.getUniformLocation(program, "iTime");
  gl.useProgram(program);
  gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attr);

  var visible = true;
  var frame = 0;
  var frameTime = 0;
  var started = performance.now();
  var active = true;
  var resizeObserver = null;
  var visibilityObserver = null;

  function resize() {
    // CSS scales the canvas; cap rendering resolution to conserve mobile GPU/battery.
    var rect = canvas.getBoundingClientRect();
    var scale = Math.min(1, 960 / Math.max(1, rect.width));
    var w = Math.max(1, Math.round(rect.width * scale));
    var h = Math.max(1, Math.round(rect.height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  }
  function draw(now) {
    frame = 0;
    if (!active || document.hidden || !visible) return;
    if (now - frameTime >= 40) { // maximum 25 frames/second
      frameTime = now;
      resize();
      gl.useProgram(program);
      gl.uniform2f(res, canvas.width, canvas.height);
      gl.uniform1f(time, (now - started)/1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    frame = window.requestAnimationFrame(draw);
  }
  function sync() {
    if (!active) return;
    if (!document.hidden && visible && !frame) frame = window.requestAnimationFrame(draw);
    if ((document.hidden || !visible) && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  if ("IntersectionObserver" in window) {
    visibilityObserver = new IntersectionObserver(function (entries) {
      visible = entries[0] ? entries[0].isIntersecting : true;
      sync();
    }, { threshold: 0 });
    visibilityObserver.observe(canvas);
  }
  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resize, { passive: true });
  }
  document.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }, { once: true });
  window.addEventListener("pagehide", function () {
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    if (resizeObserver) resizeObserver.disconnect();
    if (visibilityObserver) visibilityObserver.disconnect();
  }, { once: true });
  resize();
  sync();
})();
