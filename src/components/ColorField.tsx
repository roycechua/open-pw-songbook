import { COLOR_PRESETS, normalizeHexColor } from '#/lib/songbook'

type Props = {
  label: string
  /** Color currently shown on the sheet (override, author, or default). */
  value: string
  /** True when `value` is the built-in default rather than a chosen color. */
  isDefault?: boolean
  onChange: (hex: string) => void
  onReset?: () => void
  resetLabel?: string
  id?: string
}

/** Native color input + presets, shared by the editor and the viewer. */
export function ColorField({
  label,
  value,
  isDefault = false,
  onChange,
  onReset,
  resetLabel = 'Reset',
  id,
}: Props) {
  const current = normalizeHexColor(value) ?? '#000000'

  return (
    <div className="color-field">
      <span className="color-field__label" id={id ? `${id}-label` : undefined}>
        {label}
      </span>
      <div className="color-field__controls">
        <input
          id={id}
          type="color"
          className="color-field__input"
          value={current}
          aria-labelledby={id ? `${id}-label` : undefined}
          aria-label={id ? undefined : label}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="color-field__swatches" role="group" aria-label={`${label} presets`}>
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={
                preset === current
                  ? 'color-swatch is-active'
                  : 'color-swatch'
              }
              style={{ backgroundColor: preset }}
              aria-label={`${label} ${preset}`}
              aria-pressed={preset === current}
              onClick={() => onChange(preset)}
            />
          ))}
        </div>
        {onReset ? (
          <button
            type="button"
            className="text-btn color-field__reset"
            disabled={isDefault}
            onClick={onReset}
          >
            {resetLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
