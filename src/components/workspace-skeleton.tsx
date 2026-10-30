export function WorkspaceSkeleton() {
  return (
    <div className="workspace" aria-busy="true" aria-live="polite">
      <div className="artboard artboard-loading">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-image" />
      </div>
      <span className="visually-hidden">Loading the artboard</span>
    </div>
  )
}
