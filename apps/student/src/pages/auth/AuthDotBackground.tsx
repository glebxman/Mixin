import { useEffect, useRef } from "react";

/**
 * Анимированный фон входа: матрица точек с тремя метаболами,
 * двигающимися по синусам/косинусам. Реагирует на prefers-reduced-motion.
 */
export function AuthDotBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * pixelRatio);
      canvas!.height = Math.floor(height * pixelRatio);
      ctx!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      const isDark = document.documentElement.classList.contains("dark");
      ctx!.fillStyle = isDark ? "#0d0d0f" : "#ffffff";
      ctx!.fillRect(0, 0, width, height);

      const spacing = 18;
      const radius = 1.18;
      const reducedMotion = mediaQuery.matches;
      const progress = reducedMotion ? 0 : time * 0.00008;
      const balls = [
        {
          x: width * (0.25 + 0.11 * Math.sin(progress * 2.8)),
          y: height * (0.3 + 0.1 * Math.cos(progress * 2.2)),
          r: Math.min(width, height) * 0.22,
          strength: 0.34,
        },
        {
          x: width * (0.67 + 0.13 * Math.sin(progress * 2.1 + 2.2)),
          y: height * (0.42 + 0.12 * Math.cos(progress * 2.6 + 0.7)),
          r: Math.min(width, height) * 0.2,
          strength: 0.31,
        },
        {
          x: width * (0.47 + 0.16 * Math.sin(progress * 2.4 + 4.1)),
          y: height * (0.76 + 0.08 * Math.cos(progress * 2.9 + 3.4)),
          r: Math.min(width, height) * 0.24,
          strength: 0.28,
        },
      ];

      for (let y = 8; y < height; y += spacing) {
        for (let x = 8; x < width; x += spacing) {
          let alpha = 0.095;
          for (const ball of balls) {
            const distance = Math.hypot(x - ball.x, y - ball.y);
            const influence = Math.max(0, 1 - distance / ball.r);
            alpha += influence * influence * ball.strength;
          }
          ctx!.beginPath();
          ctx!.fillStyle = isDark
            ? `rgba(161, 161, 170, ${Math.min(alpha, 0.46)})`
            : `rgba(82, 82, 82, ${Math.min(alpha, 0.46)})`;
          ctx!.arc(x, y, radius, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function handleResize() {
      resize();
      if (mediaQuery.matches) draw(0);
    }

    resize();
    draw(0);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
