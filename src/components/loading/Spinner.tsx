type SpinnerProps = {
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

export function Spinner({
  size = 'md',
  label = 'Loading',
  className = '',
}: SpinnerProps) {
  return (
    <span
      className={
        size === 'sm'
          ? `spinner spinner--sm ${className}`.trim()
          : `spinner ${className}`.trim()
      }
      role="status"
    >
      <span className="visually-hidden">{label}</span>
    </span>
  )
}
