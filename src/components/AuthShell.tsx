import type { ReactNode } from 'react'

type AuthShellProps = {
  title: string
  lede?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, lede, children, footer }: AuthShellProps) {
  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </header>
      <div className="auth-card">{children}</div>
      {footer ? <div className="auth-page__footer">{footer}</div> : null}
    </main>
  )
}
