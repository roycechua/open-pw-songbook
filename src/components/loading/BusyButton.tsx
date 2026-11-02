import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from './Spinner'

type BusyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean
  busyLabel?: ReactNode
  /** When true, busy state shows only a spinner (for icon buttons). */
  iconOnly?: boolean
  children: ReactNode
}

export function BusyButton({
  busy = false,
  busyLabel,
  iconOnly = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: BusyButtonProps) {
  return (
    <button
      type={type}
      className={`busy-button ${iconOnly ? 'busy-button--icon' : ''} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        iconOnly ? (
          <Spinner size="sm" label={typeof busyLabel === 'string' ? busyLabel : 'Working'} />
        ) : (
          <>
            <Spinner size="sm" label="" />
            <span>{busyLabel ?? children}</span>
          </>
        )
      ) : (
        children
      )}
    </button>
  )
}
