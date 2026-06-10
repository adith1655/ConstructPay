export function Logo({
  className = "",
  textClassName = "",
  showText = true,
}: {
  className?: string;
  textClassName?: string;
  showText?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" className="fill-brand-600" />
        <path
          d="M9 21V12l7-4 7 4v9"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M13 21v-5h6v5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {showText && (
        <span className={`text-lg font-bold tracking-tight ${textClassName}`}>
          Construct<span className="text-brand-600">Pay</span>
        </span>
      )}
    </div>
  );
}
