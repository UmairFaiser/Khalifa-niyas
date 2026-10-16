'use client'; // required: this component uses hooks and browser APIs

import { useEffect, useRef } from 'react';
import { vertexSource, fragmentSource } from './shaders';

type FoilCardProps = {
  place: 1 | 2 | 3;
  name: string;
  marks: number;
};

const tiltDegrees = { x: 7, y: 9 };
const directions: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
const clampTilt = (value: number) => Math.max(-1, Math.min(1, value));

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed');
  }
  return shader;
}

export default function FoilCard({ place, name, marks }: FoilCardProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    const card = cardRef.current;
    const canvas = canvasRef.current;
    if (!surface || !card || !canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController(); // removes every listener in one go
    const { signal } = controller;

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const target = { x: 0, y: 0, shine: 0 };
    const current = { ...target };
    const velocity = { x: 0, y: 0 };
    let frame = 0;
    let previousTime = 0;

    function initializeFoil() {
      if (!gl) return;
      const program = gl.createProgram()!;
      const shaders = [
        compileShader(gl, gl.VERTEX_SHADER, vertexSource),
        compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource),
      ];
      shaders.forEach(shader => gl.attachShader(program, shader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed');
      }
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      uniforms.resolution = gl.getUniformLocation(program, 'resolution');
      uniforms.tilt = gl.getUniformLocation(program, 'tilt');
      uniforms.strength = gl.getUniformLocation(program, 'strength');
      resize();
    }

    function resize() {
      if (!gl || !canvas) return;
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      render();
    }

    function render() {
      if (!card || !canvas) return;
      card.style.setProperty('--scale', String(reducedMotion.matches ? 1 : 1 + current.shine * 0.03));
      card.style.setProperty('--rx', `${-current.y * tiltDegrees.x}deg`);
      card.style.setProperty('--ry', `${current.x * tiltDegrees.y}deg`);
      if (!gl || gl.isContextLost()) return;
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(
        uniforms.tilt,
        (current.y * tiltDegrees.x * Math.PI) / 180,
        (current.x * tiltDegrees.y * Math.PI) / 180
      );
      gl.uniform1f(uniforms.strength, current.shine);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function animate(time: number) {
      const delta = Math.min(time - (previousTime || time), 64);
      previousTime = time;
      let unsettled = false;
      const step = delta / 1000;
      const frequency = 16;
      const decay = Math.exp(-frequency * step);
      for (const key of ['x', 'y'] as const) {
        const offset = current[key] - target[key];
        const impulse = (velocity[key] + frequency * offset) * step;
        current[key] = target[key] + (offset + impulse) * decay;
        velocity[key] = (velocity[key] - frequency * impulse) * decay;
        if (Math.abs(current[key] - target[key]) > 0.0001 || Math.abs(velocity[key]) > 0.001) {
          unsettled = true;
        } else {
          current[key] = target[key];
          velocity[key] = 0;
        }
      }
      current.shine += (target.shine - current.shine) * (1 - Math.exp(-delta / 180));
      if (Math.abs(current.shine - target.shine) > 0.001) unsettled = true;
      else current.shine = target.shine;
      render();
      frame = unsettled ? requestAnimationFrame(animate) : 0;
      if (!frame) previousTime = 0;
    }

    function stopAnimation() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    }

    function update(x: number, y: number, shine: number) {
      Object.assign(target, { x, y, shine });
      if (reducedMotion.matches) {
        stopAnimation();
        Object.assign(current, { x: 0, y: 0, shine });
        Object.assign(velocity, { x: 0, y: 0 });
        render();
      } else if (!frame) frame = requestAnimationFrame(animate);
    }

    function reset() {
      update(0, 0, 0);
    }

    function onPointerMove(event: PointerEvent) {
      if (!surface) return;
      const bounds = surface.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      update(clampTilt(x), clampTilt(y), 1);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') return reset();
      if (!directions[event.key]) return;
      event.preventDefault();
      const [x, y] = directions[event.key];
      update(clampTilt(target.x + x * 0.2), clampTilt(target.y + y * 0.2), 1);
    }

    function onVisibilityChange() {
      if (!document.hidden) return;
      stopAnimation();
      Object.assign(current, { x: 0, y: 0, shine: 0 });
      Object.assign(target, current);
      Object.assign(velocity, { x: 0, y: 0 });
      render();
    }

    surface.addEventListener('pointermove', onPointerMove, { signal });
    surface.addEventListener('keydown', onKeyDown, { signal });
    surface.addEventListener('pointerleave', reset, { signal });
    surface.addEventListener('pointercancel', reset, { signal });
    surface.addEventListener(
      'pointerup',
      event => {
        if (event.pointerType !== 'mouse') reset();
      },
      { signal }
    );
    surface.addEventListener(
      'focus',
      () => {
        if (surface.matches(':focus-visible')) update(0, 0, 1);
      },
      { signal }
    );
    surface.addEventListener('blur', reset, { signal });
    reducedMotion.addEventListener('change', reset, { signal });
    document.addEventListener('visibilitychange', onVisibilityChange, { signal });
    canvas.addEventListener('webglcontextlost', event => event.preventDefault(), { signal });
    canvas.addEventListener('webglcontextrestored', initializeFoil, { signal });

    initializeFoil();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);

    // Cleanup: runs when the card leaves the page
    return () => {
      controller.abort();
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const label = `${['1st', '2nd', '3rd'][place - 1]} Place`;

  return (
    <div
      ref={surfaceRef}
      className={`interaction place-${place}`}
      tabIndex={0}
      role="img"
      aria-label={`${label}: ${name}. Move your pointer or use arrow keys to tilt.`}
    >
      <article ref={cardRef} className="card">
        <div className="artwork">
          <img className="portrait" draggable={false} src="/portrait.svg" width={264} height={360} alt="" />
          <div className="identity">
            <strong>{name}</strong>
            <span>Marks: {marks}</span>
          </div>
          <div className="caption">
            <span>{label}</span>
          </div>
          <img className="badge badge-aave" src="/aave.svg" draggable={false} alt="" />
          <img className="badge badge-cat" src="/cat.svg" draggable={false} alt="" />
          <canvas ref={canvasRef} className="foil" aria-hidden="true" />
        </div>
      </article>
    </div>
  );
}