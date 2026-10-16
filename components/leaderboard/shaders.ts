export const vertexSource = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

export const fragmentSource = `
  precision highp float;
  uniform vec2 resolution;
  uniform vec2 tilt;
  uniform float strength;

  mat3 orientation(vec2 angle) {
    float cx = cos(angle.x), sx = sin(angle.x);
    float cy = cos(angle.y), sy = sin(angle.y);
    return mat3(cy, sx * sy, -cx * sy, 0.0, cx, sx, sy, -sx * cy, cx * cy);
  }

  vec3 spectrum(float hue) {
    return clamp(abs(fract(hue + vec3(0.0, 0.666667, 0.333333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    uv.y = 1.0 - uv.y;
    vec2 density = vec2(71.0, 96.0);
    vec2 grid = uv * density;
    vec2 cell = floor(grid);
    float seed = hash(cell);
    vec2 offset = vec2(hash(cell + 3.7), hash(cell + 9.2));
    vec2 flake = abs(fract(grid) - (0.22 + offset * 0.56));
    vec2 size = vec2(mix(0.25, 0.43, seed), mix(0.23, 0.41, offset.x));
    vec2 edge = density / resolution;
    vec2 shape = 1.0 - smoothstep(size - edge * 0.5, size + edge * 0.5, flake);
    float grain = shape.x * shape.y * mix(0.15, 1.0, pow(seed, 0.65));
    mat3 rotation = orientation(tilt);
    vec3 position = rotation * vec3((uv.x - 0.5) * 0.735, 0.5 - uv.y, 0.0);
    vec3 normal = rotation * normalize(vec3((offset - 0.5) * 0.035, 1.0));
    vec3 view = normalize(vec3(0.0, 0.0, 1.66) - position);
    vec3 ray = reflect(-view, normal);
    float phase = ray.y + 2.0 * ray.x * ray.x;
    float band = exp(-pow((phase - 0.22) / 0.095, 4.0));
    float hue = (phase - 0.125) / 0.19 * 0.66;
    vec3 rainbow = spectrum(hue);
    float glint = mix(0.4, 1.5, seed * seed);
    vec3 foil = rainbow * band * grain * glint;
    float panel = exp(-pow((phase - 0.22) / 0.13, 4.0));
    vec3 color = clamp(foil + panel * 0.035, 0.0, 1.0);
    gl_FragColor = vec4(color, strength);
  }
`;