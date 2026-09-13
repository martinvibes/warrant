import { useEffect, useRef } from 'react';

/**
 * The ledger field behind the hero.
 *
 * Two things are drawn. The first is a grid of points, which is the graph
 * paper a ledger is ruled on; it lights under the pointer, so the ground
 * responds to a reader rather than looping at them. The second is a ring that
 * leaves the centre every few seconds and carries the points outward as it
 * passes: one purchase settling, spreading through the book.
 *
 * It is deliberately faint. This sits under a headline, and a background that
 * competes with the headline is a background that failed.
 */

const SPACING = 30;
/** How far the pointer's light reaches. */
const REACH = 165;
/** Seconds between settlements. */
const SETTLE_EVERY = 4.6;
/** How long one ring takes to cross the field. */
const RING_LIFE = 3.6;

interface Ring {
  /** Seconds since this ring left the centre. */
  age: number;
}

export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();
    let sinceSettle = SETTLE_EVERY - 1.4;
    const rings: Ring[] = [];

    // Kept off screen until the pointer arrives, so nothing is lit before the
    // reader has touched the page.
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Writing the backing store on every observation is how a ResizeObserver
      // ends up observing its own writes, so nothing is touched unless the box
      // genuinely changed size.
      if (Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 1) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const reach = width * 0.68;

      if (!still) {
        sinceSettle += dt;
        if (sinceSettle >= SETTLE_EVERY) {
          sinceSettle = 0;
          rings.push({ age: 0 });
        }
        for (const ring of rings) ring.age += dt;
        while (rings.length && rings[0].age > RING_LIFE) rings.shift();
      }

      // The ring itself, barely there. The points do most of the telling.
      for (const ring of rings) {
        const t = ring.age / RING_LIFE;
        const radius = reach * (1 - Math.pow(1 - t, 2.4));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232, 181, 92, ${0.16 * (1 - t)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING;
          const y = j * SPACING;

          // Distance to the pointer, as a 0..1 nearness.
          const pd = Math.hypot(x - pointer.x, y - pointer.y);
          const near = pd < REACH ? 1 - pd / REACH : 0;

          // Whatever the nearest ring is doing to this point right now.
          let wave = 0;
          for (const ring of rings) {
            const t = ring.age / RING_LIFE;
            const radius = reach * (1 - Math.pow(1 - t, 2.4));
            const band = Math.abs(Math.hypot(x - cx, y - cy) - radius);
            if (band < 46) wave = Math.max(wave, (1 - band / 46) * (1 - t * 0.75));
          }

          const lit = Math.max(near * near, wave);
          const alpha = 0.1 + lit * 0.55;
          const size = 1 + lit * 1.7;

          // Warm white at rest, brass where something is happening to it.
          ctx.fillStyle =
            lit > 0.02
              ? `rgba(${Math.round(247 - 15 * lit)}, ${Math.round(246 - 65 * lit)}, ${Math.round(243 - 151 * lit)}, ${alpha})`
              : `rgba(247, 246, 243, ${alpha})`;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
      frame = requestAnimationFrame(loop);
    };

    // Stopped rather than idled when the hero is scrolled away: a loop that
    // wakes sixty times a second to decide not to paint is still a loop.
    const start = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    resize();
    if (still) {
      draw(0);
      return;
    }

    const seen = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) start();
      else stop();
    });
    seen.observe(canvas);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    start();

    return () => {
      stop();
      seen.disconnect();
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        // Open in the middle, so the field surrounds the orb rather than
        // sitting under the headline, and fades out at the edges so it has no
        // visible boundary.
        maskImage:
          'radial-gradient(ellipse 86% 82% at 50% 46%, transparent 33%, #000 58%, #000 78%, transparent 99%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 86% 82% at 50% 46%, transparent 33%, #000 58%, #000 78%, transparent 99%)',
      }}
    />
  );
}
