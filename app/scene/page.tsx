"use client";

import { useState } from "react";
import { Scene } from "@/src/Scene";
import { KageLandingPage, ConstellationField, TextAnimationCollection } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export default function ScenePreviewPage() {
  const [activeTab, setActiveTab] = useState<"liquid" | "kage" | "constellation" | "intro">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "kage" || p === "constellation" || p === "intro") return p;
    }
    return "liquid";
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#050506",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "2rem 1rem",
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: "1.5rem", textAlign: "center", position: "relative", width: "100%", maxWidth: "860px" }}>
        <div style={{ position: "absolute", left: 0, top: "4px" }}>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#a1a1aa",
              textDecoration: "none",
              fontSize: "0.85rem",
              padding: "6px 12px",
              borderRadius: "6px",
              background: "#18181b",
              border: "1px solid #27272a"
            }}
          >
            ← Crown Coffee
          </a>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          ThreeUI Components Showcase
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("liquid")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: activeTab === "liquid" ? "1px solid #ffffff" : "1px solid #333338",
              backgroundColor: activeTab === "liquid" ? "#1a1b20" : "transparent",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            LiquidMetalButton (Play)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("constellation")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: activeTab === "constellation" ? "1px solid #ffffff" : "1px solid #333338",
              backgroundColor: activeTab === "constellation" ? "#1a1b20" : "transparent",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            ConstellationField
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kage")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: activeTab === "kage" ? "1px solid #ffffff" : "1px solid #333338",
              backgroundColor: activeTab === "kage" ? "#1a1b20" : "transparent",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            KageLandingPage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("intro")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: activeTab === "intro" ? "1px solid #ffffff" : "1px solid #333338",
              backgroundColor: activeTab === "intro" ? "#1a1b20" : "transparent",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            ThreeUIIntro
          </button>
        </div>
      </header>

      <style jsx global>{`
        .shader-frame {
          position: relative;
          width: 100%;
          max-width: 860px;
          height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 16px;
          background: radial-gradient(46vmax 32vmax at 50% 47%, #191b21 0%, #0e0f13 34%, #050506 62%, #000 88%) #000;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }
      `}</style>

      {activeTab === "liquid" && <Scene />}

      {activeTab === "constellation" && (
        <div className="shader-frame">
          <ConstellationField
            mode="dark"
            speed={1.00}
            size={1.00}
            strokeWidth={1.00}
            length={1.00}
            density={1.00}
            opacity={1.00}
            hue={0}
            saturation={1.00}
            brightness={1.00}
          />
        </div>
      )}

      {activeTab === "kage" && (
        <div style={{ width: "100%", maxWidth: "1200px", height: "800px", borderRadius: "16px", overflow: "hidden" }}>
          <KageLandingPage
            headingFont="onest"
            bodyFont="onest"
            headingWeight="400"
            bodyWeight="300"
            primaryColor="#e0231c"
            headingSize={46}
            bodySize={17}
            headingLetterSpacing={-0.012}
          />
        </div>
      )}

      {activeTab === "intro" && (
        <div className="shader-frame">
          <TextAnimationCollection
            variant="threeui-intro"
            mode="dark"
            hue={0}
            saturation={1.00}
            brightness={1.00}
          />
        </div>
      )}
    </main>
  );
}
