"use client";
import * as React from "react";

type Palette = "mixed" | "cyan" | "violet";

export function GraphBG({
  density = 50,
  opacity = 0.22,
  animated = true,
  palette = "mixed",
}: {
  density?: number;
  opacity?: number;
  animated?: boolean;
  palette?: Palette;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      cv.width = r.width * dpr;
      cv.height = r.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();

    const W = () => cv.getBoundingClientRect().width;
    const H = () => cv.getBoundingClientRect().height;

    const colors =
      palette === "cyan"
        ? ["#22D3EE"]
        : palette === "violet"
        ? ["#A78BFA"]
        : ["#22D3EE", "#A78BFA", "#FB923C", "#3F3F46", "#3F3F46"];

    type Node = { x: number; y: number; vx: number; vy: number; r: number; c: string; pulse: number };
    const nodes: Node[] = Array.from({ length: density }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: 2 + Math.random() * 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI * 2,
    }));

    const edges: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.hypot(dx, dy) < 130 && Math.random() < 0.35) edges.push([i, j]);
      }
    }

    let raf = 0;
    const draw = () => {
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#3F3F46";
      ctx.lineWidth = 0.5;
      for (const [a, b] of edges) {
        ctx.beginPath();
        ctx.moveTo(nodes[a].x, nodes[a].y);
        ctx.lineTo(nodes[b].x, nodes[b].y);
        ctx.stroke();
      }
      for (const n of nodes) {
        if (animated) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          n.pulse += 0.02;
        }
        const pulse = animated ? 1 + Math.sin(n.pulse) * 0.15 : 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = n.c;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = n.c;
        ctx.globalAlpha = 0.08;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (animated) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density, animated, palette]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}
