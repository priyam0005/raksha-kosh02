function RakshaLogo({ size = "md" }) {
  const sizeMap = {
    sm: { box: "w-9 h-9 rounded-xl", svg: 20, innerSvg: 23 },
    md: { box: "w-13 h-13 rounded-2xl", svg: 28, innerSvg: 32 },
    lg: { box: "w-18 h-18 rounded-2xl", svg: 40, innerSvg: 46 },
  };
  const { box, svg: svgSize } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`${box} flex items-center justify-center bg-blue-950/20 border border-blue-500/25`}
    >
      <svg
        width={svgSize}
        height={svgSize * 1.12}
        viewBox="0 0 24 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 1.5L2 5.5V13C2 18.55 6.42 23.74 12 25.5C17.58 23.74 22 18.55 22 13V5.5L12 1.5Z"
          stroke="#3B82F6"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M12 5L5 8.2V13C5 17.1 8.15 20.9 12 22.3C15.85 20.9 19 17.1 19 13V8.2L12 5Z"
          stroke="#3B82F6"
          strokeWidth="0.8"
          strokeLinejoin="round"
          fill="rgba(59,130,246,0.07)"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

export default RakshaLogo;
