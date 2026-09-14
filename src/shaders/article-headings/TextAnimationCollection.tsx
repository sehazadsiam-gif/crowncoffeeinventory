"use client";

import React, { Suspense } from "react";
import { ThreeUIIntro } from "../neuform-isolated/NeuformIsolatedEffects";

export type TextAnimationCollectionProps = {
  variant?: string;
  mode?: "light" | "dark";
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
};

const fallbackPlaceholder = (
  <div className="threeui-background" style={{ background: "#090909" }} />
);

export function TextAnimationCollection({
  variant = "threeui-intro",
  ...props
}: TextAnimationCollectionProps) {
  if (variant === "threeui-intro") {
    return (
      <Suspense fallback={fallbackPlaceholder}>
        <ThreeUIIntro {...props} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallbackPlaceholder}>
      <ThreeUIIntro {...props} />
    </Suspense>
  );
}
