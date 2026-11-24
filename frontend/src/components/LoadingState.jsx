const LoadingState = ({ label = 'Preparing your science space...', subtitle = '', compact = false }) => (
  <div className={`science-loading ${compact ? 'science-loading-compact' : ''}`} role="status" aria-live="polite" aria-label={label}>
    <div className="science-loading-orbit" aria-hidden="true">
      <span className="science-loading-dot science-loading-dot-one" />
      <span className="science-loading-dot science-loading-dot-two" />
      <span className="science-loading-dot science-loading-dot-three" />
      <div className="science-loading-core">✦</div>
    </div>
    <div className="science-loading-copy">
      <div>
        <strong>{label}</strong>
        {subtitle && <p className="science-loading-subtitle">{subtitle}</p>}
      </div>
      <span className="science-loading-dots" aria-hidden="true"><i /> <i /> <i /></span>
    </div>
  </div>
)

export default LoadingState
