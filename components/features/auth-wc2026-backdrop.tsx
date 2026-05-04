/**
 * Fondo decorativo estilo FIFA World Cup 2026 / Panini (magenta + bandas).
 * Colocar dentro de un padre `relative overflow-hidden` acotado al layout (p. ej.
 * la columna de contenido); evitar `100vw` centrado en viewport para no solapar sidebars.
 */
export function AuthWc2026Backdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Capa base — magenta oficial aproximado */}
      <div className="absolute inset-0 bg-[#d02670] dark:bg-[#7a1545]" />
      {/* Manchas / arcos (azul, naranja, lima) */}
      <svg
        className="absolute -top-[8%] -left-[25%] h-[85%] w-[150%] opacity-[0.92] sm:-left-[12%] sm:w-[125%]"
        viewBox="0 0 900 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-80 120 C180 20 420 280 780 80"
          stroke="#2b59c3"
          strokeWidth="120"
          strokeLinecap="round"
        />
        <path
          d="M-40 420 C200 300 500 520 820 360"
          stroke="#ff8200"
          strokeWidth="95"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M120 620 C380 480 620 720 920 520"
          stroke="#a4d65e"
          strokeWidth="78"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path
          d="M400 -40 C520 180 280 320 640 200"
          stroke="#2b59c3"
          strokeWidth="64"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
      <svg
        className="absolute -right-[20%] bottom-[-15%] h-[70%] w-[120%] opacity-90 sm:right-0 sm:w-[90%]"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M900 480 C650 380 500 520 200 420"
          stroke="#a4d65e"
          strokeWidth="100"
          strokeLinecap="round"
        />
        <path
          d="M820 120 C600 40 400 200 100 80"
          stroke="#ff8200"
          strokeWidth="72"
          strokeLinecap="round"
          opacity="0.88"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-black/[0.07] via-transparent to-black/15 dark:from-black/25 dark:to-black/40" />
    </div>
  );
}
