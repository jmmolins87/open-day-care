"use client";

import { AnimatePresence, motion, type MotionProps } from "framer-motion";
import { useLoaderContext } from "./LoaderContext";
import { type LoaderVariant, type LoaderSize } from "./LoaderContext";

const SIZE_MAP: Record<LoaderSize, number> = {
  sm: 20,
  md: 32,
  lg: 48,
};

export interface LoaderProps extends Omit<MotionProps, "animate" | "initial"> {
  variant?: LoaderVariant;
  size?: LoaderSize;
  message?: string;
  className?: string;
  ariaLabel?: string;
}

function Spinner({ size, className, ariaLabel }: { size: number; className?: string; ariaLabel?: string }) {
  const strokeWidth = size <= 24 ? 2.5 : size <= 36 ? 3 : 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * 0.25;

  return (
<svg
        className={`animate-spin motion-reduce:animate-none ${className ?? ""}`}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-hidden="true"
        role="img"
        aria-label={ariaLabel ?? "Cargando"}
        style={{ width: size, height: size }}
      >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        opacity={0.3}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{
          transformOrigin: "center",
          transformBox: "fill-box",
        }}
      />
    </svg>
  );
}

function Dots({ size, className, "aria-label": ariaLabel }: { size: number; className?: string; "aria-label"?: string }) {
  const dotSize = Math.max(4, size / 8);
  const gap = Math.max(4, size / 10);
  const containerSize = dotSize * 3 + gap * 2;

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? "Cargando"}
      style={{ width: containerSize, height: dotSize, display: "flex", alignItems: "center", gap }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: "currentColor",
          }}
          animate={{ scale: [1, 0.5, 1], opacity: [1, 0.4, 1] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

function Bar({ size, className, "aria-label": ariaLabel }: { size: number; className?: string; "aria-label"?: string }) {
  const height = Math.max(3, size / 10);
  const width = size * 2.5;

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel ?? "Cargando"}
      style={{ width, height }}
    >
      <motion.div
        className="rounded-full"
        style={{
          width: "30%",
          height: "100%",
          backgroundColor: "currentColor",
          borderRadius: height / 2,
        }}
        animate={{ x: [0, width * 0.7, 0] }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

const VARIANT_COMPONENTS: Record<LoaderVariant, React.ComponentType<{ size: number; className?: string; "aria-label"?: string }>> = {
  spinner: Spinner,
  dots: Dots,
  bar: Bar,
};

export function Loader({
  variant = "spinner",
  size = "md",
  message,
  className = "",
  ariaLabel,
  ...motionProps
}: LoaderProps) {
  const pixelSize = SIZE_MAP[size];
  const Component = VARIANT_COMPONENTS[variant];

  return (
    <motion.div
      className={`flex flex-col items-center gap-3 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      {...motionProps}
    >
      <Component
        size={pixelSize}
        className="text-[var(--color-accent-strong)]"
        aria-label={ariaLabel}
      />
      {message && (
        <span
          className="text-sm font-medium text-[var(--color-ink)]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {message}
        </span>
      )}
    </motion.div>
  );
}

export function GlobalLoaderBar() {
  const { globalState } = useLoaderContext();

  return (
    <AnimatePresence>
      {globalState.isVisible && (
        <motion.div
          key="global-loader-bar"
          className="fixed top-0 left-0 right-0 z-[9999] h-1.5 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, var(--color-accent), var(--color-accent-strong))",
            boxShadow: "0 2px 8px rgba(217, 88, 60, 0.3)",
            transformOrigin: "left center",
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 0, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.2, ease: "easeOut" },
            opacity: { duration: 0.15, ease: "easeOut" },
          }}
          role="progressbar"
          aria-label={globalState.message ?? "Cargando"}
        >
          <span className="sr-only">Cargando…</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GlobalLoaderOverlay({
  message,
  blocking = false,
}: {
  message?: string;
  /** When true the overlay captures pointer events; default lets clicks pass through. */
  blocking?: boolean;
}) {
  const { globalState } = useLoaderContext();
  const label = message ?? globalState.message ?? "Cargando";

  return (
    <AnimatePresence>
      {globalState.isVisible && (
        <motion.div
          key="global-loader-overlay"
          className={`fixed inset-0 z-[9998] flex items-center justify-center ${
            blocking ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{
            backgroundColor: "rgba(255, 253, 249, 0.85)",
            backdropFilter: "blur(2px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <motion.div
            className="flex flex-col items-center gap-4 rounded-[18px] bg-[var(--color-surface)] p-6 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] border border-[var(--color-border)]"
            style={{ minWidth: 160 }}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            aria-label={label}
          >
            <Loader variant="spinner" size="lg" />
            <span
              className="text-sm font-medium text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {label}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}