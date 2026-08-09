'use client';

import { animate, motion, useMotionValue } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SheetSnap = 'collapsed' | 'half' | 'full';

/**
 * Fraction of the sheet's height hidden below the viewport at each stop.
 * `full` shows everything; `collapsed` leaves a peek with the result count and
 * the first card, which is what keeps the map usable while the list is still
 * reachable with one thumb.
 */
const SNAP_OFFSET: Record<SheetSnap, number> = {
  full: 0,
  half: 0.46,
  collapsed: 0.78,
};

const SNAP_ORDER: SheetSnap[] = ['full', 'half', 'collapsed'];

/**
 * Draggable bottom sheet, the mobile half of the map-first layout.
 *
 * Deliberately not a modal: a dialog would trap focus and cover the map, and
 * the whole point is that the citizen keeps map context while scanning the
 * list. It is `md:hidden`, desktop uses the side panel instead.
 *
 * Snapping accounts for velocity, so a quick flick moves a stop even when the
 * finger barely travelled. Without that, the sheet feels stuck.
 */
export function BottomSheet({
  children,
  initialSnap = 'half',
  heightVh = 88,
  ariaLabel,
}: {
  children: React.ReactNode;
  initialSnap?: SheetSnap;
  heightVh?: number;
  ariaLabel: string;
}) {
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [snap, setSnap] = useState<SheetSnap>(initialSnap);

  // Measure rather than assume: `88vh` in CSS and the pixel height React needs
  // for the drag maths diverge once the browser chrome hides on scroll.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const measure = () => setHeight(el.getBoundingClientRect().height);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const settle = useCallback(
    (next: SheetSnap, velocity = 0) => {
      setSnap(next);
      const target = SNAP_OFFSET[next] * height;
      const reduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced) {
        y.set(target);
        return;
      }
      animate(y, target, { type: 'spring', stiffness: 420, damping: 40, velocity });
    },
    [height, y],
  );

  useEffect(() => {
    if (height > 0) settle(snap);
    // Re-settling on height change keeps the sheet aligned after a rotation.
    // `snap` is intentionally omitted, including it would re-animate on every
    // user-driven snap change, fighting the drag gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, settle]);

  function handleDragEnd(_: unknown, info: { offset: { y: number }; velocity: { y: number } }): void {
    const current = SNAP_OFFSET[snap] * height;
    const projected = current + info.offset.y + info.velocity.y * 0.08;

    let nearest = SNAP_ORDER[0] as SheetSnap;
    let best = Infinity;
    for (const candidate of SNAP_ORDER) {
      const distance = Math.abs(SNAP_OFFSET[candidate] * height - projected);
      if (distance < best) {
        best = distance;
        nearest = candidate;
      }
    }
    settle(nearest, info.velocity.y);
  }

  function cycleSnap(): void {
    const order: SheetSnap[] = ['collapsed', 'half', 'full'];
    const index = order.indexOf(snap);
    settle(order[(index + 1) % order.length] as SheetSnap);
  }

  return (
    <motion.div
      ref={sheetRef}
      role="region"
      aria-label={ariaLabel}
      style={{ y, height: `${heightVh}dvh` }}
      drag="y"
      dragElastic={0.04}
      dragMomentum={false}
      dragConstraints={{ top: 0, bottom: SNAP_OFFSET.collapsed * height }}
      onDragEnd={handleDragEnd}
      className="fixed inset-x-0 bottom-0 z-[30] flex touch-none flex-col rounded-t-[var(--radius-sheet)] border-t border-border bg-card shadow-[var(--shadow-sheet)] md:hidden"
    >
      {/* The grabber is also a button: dragging is a pointer-only gesture, so
       * without a tap/keyboard equivalent the sheet is unusable for anyone not
       * using a finger. */}
      <button
        type="button"
        onClick={cycleSnap}
        aria-label={ariaLabel}
        aria-expanded={snap !== 'collapsed'}
        className="flex w-full shrink-0 justify-center py-3"
      >
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-input" />
      </button>

      {/* `touch-pan-y` restores scrolling inside the list while the sheet
       * itself owns vertical drag. */}
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-8">{children}</div>
    </motion.div>
  );
}
