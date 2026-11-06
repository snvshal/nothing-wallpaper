import { useEffect, useRef, useState } from "react";
import createGlobe, { type Globe as CobeGlobe, type Marker } from "cobe";
import { getLocation } from "../lib/weather";

const FRAME_INTERVAL = 1000 / 30;
const ROTATION_SPEED = 0.1;
const GLOBE_SCALE = 1.24;
const COBE_SPHERE_RADIUS = 0.8;
const GLOBE_MASK_RADIUS = COBE_SPHERE_RADIUS * GLOBE_SCALE * 100;
const GLOBE_MASK_FEATHER = 0.5;
const MAP_SAMPLES = 8000;
const MARKER_SIZE = 0.05;
const MARKER_ELEVATION = 0.02;
const FALLBACK_PRIMARY: [number, number, number] = [1, 1, 1];
const FALLBACK_MUTED: [number, number, number] = [0.7, 0.7, 0.7];
const FALLBACK_RED: [number, number, number] = [0.84, 0.1, 0.13];
const FALLBACK_BG: [number, number, number] = [1, 1, 1];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseColor(value: string, fallback: [number, number, number]): [number, number, number] {
  const parts = value.match(/-?\d*\.?\d+/g);
  if (!parts || parts.length < 3) return fallback;
  const isSrgb = value.includes("color(srgb");
  return [
    clamp01(Number(parts[0]) / (isSrgb ? 1 : 255)),
    clamp01(Number(parts[1]) / (isSrgb ? 1 : 255)),
    clamp01(Number(parts[2]) / (isSrgb ? 1 : 255)),
  ];
}

function readTokenColor(
  token: string,
  fallback: [number, number, number],
): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.color = `var(${token})`;
  document.documentElement.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return parseColor(value, fallback);
}

function currentDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function pixelSize(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  const dpr = currentDpr();
  return {
    width: Math.max(1, Math.round(rect.width * dpr)),
    height: Math.max(1, Math.round(rect.height * dpr)),
  };
}

function initialPhi(longitude: number): number {
  const phi = (3 * Math.PI) / 2 - (longitude * Math.PI) / 180;
  return ((phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

interface GlobeWidgetProps {
  city?: string;
}

export default function GlobeWidget({ city }: GlobeWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeRef = useRef<CobeGlobe | null>(null);
  const markerRef = useRef<Marker[]>([]);
  const phiRef = useRef(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const testCanvas = document.createElement("canvas");
    const testGl = testCanvas.getContext("webgl2") ?? testCanvas.getContext("webgl");
    if (!testGl) {
      setFailed(true);
      return;
    }
    testGl.getExtension("WEBGL_lose_context")?.loseContext();

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    const mask = `radial-gradient(circle closest-side, black 0 ${
      GLOBE_MASK_RADIUS - GLOBE_MASK_FEATHER
    }%, transparent ${GLOBE_MASK_RADIUS}%)`;
    canvas.style.setProperty("mask-image", mask);
    canvas.style.setProperty("-webkit-mask-image", mask);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Rotating globe");
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const size = pixelSize(container);
    const globe = createGlobe(canvas, {
      width: size.width,
      height: size.height,
      devicePixelRatio: 1,
      phi: phiRef.current,
      theta: 0,
      mapSamples: MAP_SAMPLES,
      mapBrightness: 6,
      baseColor: FALLBACK_PRIMARY,
      markerColor: FALLBACK_RED,
      glowColor: FALLBACK_MUTED,
      markers: markerRef.current,
      diffuse: 1.2,
      dark: 1,
      markerElevation: MARKER_ELEVATION,
      scale: GLOBE_SCALE,
      context: { powerPreference: "low-power" },
    });
    globeRef.current = globe;

    let rafId = 0;
    let last = 0;
    let accumulator = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (!last) last = now;
      const delta = Math.min(now - last, 100);
      last = now;
      accumulator += delta;
      if (accumulator < FRAME_INTERVAL) return;
      const elapsed = accumulator;
      accumulator = 0;
      phiRef.current = (phiRef.current + (elapsed / 1000) * ROTATION_SPEED) % (Math.PI * 2);
      globe.update({ phi: phiRef.current });
    };

    const stop = () => {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const start = () => {
      if (rafId) return;
      last = 0;
      accumulator = 0;
      rafId = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    const applyTheme = () => {
      const light = document.documentElement.getAttribute("data-theme") === "light";
      globe.update({
        baseColor: light
          ? readTokenColor("--theme-bg-widget", FALLBACK_BG)
          : readTokenColor("--theme-text-primary", FALLBACK_PRIMARY),
        glowColor: readTokenColor("--theme-text-muted", FALLBACK_MUTED),
        markerColor: readTokenColor("--color-nothing-widget-red", FALLBACK_RED),
        dark: light ? 0 : 1,
      });
    };

    applyTheme();

    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const onResize = () => {
      const next = pixelSize(container);
      globe.update({ width: next.width, height: next.height });
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    onResize();

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      globe.destroy();
      globeRef.current = null;
      canvasRef.current = null;
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    let active = true;

    getLocation(city)
      .then((location) => {
        if (!active) return;
        markerRef.current = [
          { location: [location.latitude, location.longitude], size: MARKER_SIZE },
        ];
        phiRef.current = initialPhi(location.longitude);
        globeRef.current?.update({ markers: markerRef.current, phi: phiRef.current });
        canvasRef.current?.setAttribute("aria-label", `Globe with marker for ${location.city}`);
      })
      .catch(() => {
        if (!active) return;
        markerRef.current = [];
        globeRef.current?.update({ markers: [] });
        canvasRef.current?.setAttribute("aria-label", "Rotating globe");
      });

    return () => {
      active = false;
    };
  }, [city]);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <span
          role="img"
          aria-label="Rotating globe"
          className="font-emoji text-widget-display leading-none text-theme-muted"
        >
          {"\u{1F310}"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
