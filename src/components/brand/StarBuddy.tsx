/**
 * Original little star character used as the app mascot in the starry theme.
 * Drawn here (not copied from any artwork) so it can sit at any size.
 */
export function StarBuddy({
  size = 20,
  className,
  blush = true,
}: {
  size?: number;
  className?: string;
  blush?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M16 3.4l3.4 7.3 8 .9-5.9 5.5 1.7 8-7.2-4.1-7.2 4.1 1.7-8-5.9-5.5 8-.9z"
        fill="currentColor"
        stroke="rgba(74, 54, 35, 0.14)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle cx="13.1" cy="15" r="1.15" fill="#4A3623" />
      <circle cx="18.9" cy="15" r="1.15" fill="#4A3623" />
      {blush && (
        <>
          <circle cx="10.7" cy="17.5" r="1.2" fill="#F49CA8" opacity="0.75" />
          <circle cx="21.3" cy="17.5" r="1.2" fill="#F49CA8" opacity="0.75" />
        </>
      )}
      <path
        d="M14.4 18.3c.6.7 1.5.7 2.1 0"
        stroke="#4A3623"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
