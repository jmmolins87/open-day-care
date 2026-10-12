"use client";

import { useCallback, useId, useMemo } from "react";
import { useLoaderContext, type InlineLoaderState, type LoaderVariant, type LoaderSize } from "@/components/loader/LoaderContext";
import { Loader as LoaderComponent, type LoaderProps } from "@/components/loader/Loader";

export interface UseLoaderReturn {
  isLoading: boolean;
  show: (options?: Partial<InlineLoaderState>) => void;
  hide: () => void;
  setMessage: (message: string) => void;
  setVariant: (variant: LoaderVariant) => void;
  setSize: (size: LoaderSize) => void;
  Loader: React.ComponentType<{ className?: string }>;
}

interface InlineLoaderProps extends Omit<LoaderProps, "variant" | "size" | "message"> {
  loaderId: string;
}

function InlineLoader({ loaderId, className, ...props }: InlineLoaderProps) {
  const { inlineStates } = useLoaderContext();
  const state = inlineStates.get(loaderId);

  if (!state?.isVisible) {
    return null;
  }

  return (
    <LoaderComponent
      variant={state.variant}
      size={state.size}
      message={state.message}
      className={className}
      aria-busy="true"
      {...props}
    />
  );
}

export function useLoader(loaderId?: string): UseLoaderReturn {
  const id = useId();
  const resolvedId = loaderId ?? id;

  const { inlineStates, showInline, hideInline } = useLoaderContext();

  // Read from reactive state on every render: `inlineStates` is a new Map
  // identity on each update, so `isLoading` never goes stale.
  const state = inlineStates.get(resolvedId);

  const show = useCallback(
    (options?: Partial<InlineLoaderState>) => {
      showInline(resolvedId, options);
    },
    [showInline, resolvedId]
  );

  const hide = useCallback(() => {
    hideInline(resolvedId);
  }, [hideInline, resolvedId]);

  const setMessage = useCallback(
    (message: string) => {
      const current = inlineStates.get(resolvedId);
      showInline(resolvedId, { ...current, message });
    },
    [showInline, inlineStates, resolvedId]
  );

  const setVariant = useCallback(
    (variant: LoaderVariant) => {
      const current = inlineStates.get(resolvedId);
      if (current) {
        showInline(resolvedId, { ...current, variant });
      }
    },
    [showInline, inlineStates, resolvedId]
  );

  const setSize = useCallback(
    (size: LoaderSize) => {
      const current = inlineStates.get(resolvedId);
      if (current) {
        showInline(resolvedId, { ...current, size });
      }
    },
    [showInline, inlineStates, resolvedId]
  );

  const Loader = useMemo(() => {
    function ResolvedInlineLoader(props: { className?: string }) {
      return <InlineLoader loaderId={resolvedId} {...props} />;
    }
    return ResolvedInlineLoader;
  }, [resolvedId]);

  return {
    isLoading: state?.isVisible ?? false,
    show,
    hide,
    setMessage,
    setVariant,
    setSize,
    Loader,
  };
}
