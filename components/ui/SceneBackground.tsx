interface SceneBackgroundProps {
  src: string;
  opacity?: number;
}

/**
 * Fixed full-bleed background image with ink gradient overlay and vignette.
 * Used by landing, exam, palace, and era transition screens.
 */
export function SceneBackground({ src, opacity = 0.78 }: SceneBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${src})` }}
      />
      {/* Ink gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(15,12,8,${opacity}) 0%, rgba(15,12,8,${Math.min(opacity + 0.14, 0.96)}) 100%)`,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.6) 90%)",
        }}
      />
    </div>
  );
}
