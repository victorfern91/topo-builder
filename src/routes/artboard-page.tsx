/** @jsxImportSource react */
import { Button } from '@base-ui/react/button'
import { useSelector } from '@tanstack/react-store'
import { OctaneCompat } from 'octane/react'
import { PlacedImage } from '../islands/placed-image.tsrx'
import { imageDocumentStore, requestImageFilePicker } from '../state/image-document.ts'

export default function ArtboardPage() {
  const opened = useSelector(imageDocumentStore, (state) => state)

  if (opened.status === 'loading') {
    return (
      <section className="workspace" aria-busy="true" aria-live="polite">
        <div className="artboard artboard-loading">
          <p className="board-kicker">Opening {opened.fileName}</p>
          <div className="skeleton skeleton-image" />
        </div>
      </section>
    )
  }

  if (opened.status === 'error') {
    return (
      <section className="workspace">
        <div className="artboard artboard-message" role="alert">
          <h1>Can’t show this file</h1>
          <p>{opened.message}</p>
          <Button className="board-button" onClick={requestImageFilePicker}>
            Choose another file
          </Button>
        </div>
      </section>
    )
  }

  if (opened.status === 'ready' && opened.objectUrl) {
    return (
      <section className="workspace">
        <div className="artboard artboard-image">
          <OctaneCompat key={opened.objectUrl}>
            <PlacedImage
              src={opened.objectUrl}
              alt={opened.fileName ?? 'Opened image'}
            />
          </OctaneCompat>
        </div>
      </section>
    )
  }

  return (
    <section className="workspace">
      <div className="artboard artboard-message">
        <h1>No image on the artboard</h1>
        <p>
          Open a PNG, JPEG, GIF, WebP, AVIF, BMP, or SVG. Topo places it on the
          board, scaled down if it is larger than the workspace.
        </p>
        <Button className="board-button" onClick={requestImageFilePicker}>
          Open image
        </Button>
      </div>
    </section>
  )
}
