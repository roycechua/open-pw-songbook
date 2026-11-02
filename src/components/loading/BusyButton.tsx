import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from './Spinner'

type BusyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean
  busyLabel?: ReactNode
  children: ReactNode
}

export function BusyButton({
  busy = false,
  busyLabel,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: BusyButtonProps) {
  return (
    <button
      type={type}
      className={`busy-button ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? (
        <>
          <Spinner size="sm" label="" />
          <span>{busyLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
