import { Button } from '@base-ui/react/button'
import { Menu } from '@base-ui/react/menu'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, type ChangeEvent } from 'react'
import {
  IMAGE_FILE_ACCEPT,
  imageDocumentStore,
  openImageFile,
  registerImageFilePicker,
  requestImageFilePicker,
} from '../state/image-document.ts'

export function TopBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const fileName = useSelector(imageDocumentStore, (state) => state.fileName)
  const shortcutLabel = applePlatform() ? '⌘O' : 'Ctrl+O'

  useEffect(() => {
    document.title = fileName ? `${fileName} — Topo` : 'Topo'
  }, [fileName])

  useEffect(() => {
    return registerImageFilePicker(() => {
      inputRef.current?.click()
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'o') {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== 'file')
      ) {
        return
      }
      event.preventDefault()
      inputRef.current?.click()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) openImageFile(file)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Topo
      </div>
      <Menu.Root>
        <Menu.Trigger className="bar-button">File</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="file-menu-positioner" sideOffset={6} align="start">
            <Menu.Popup className="file-menu-popup">
              <Menu.Item
                className="file-menu-item"
                onClick={() => inputRef.current?.click()}
              >
                <span>Open…</span>
                <span className="file-menu-kbd">{shortcutLabel}</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <p className="doc-title" title={fileName ?? undefined}>
        {fileName ?? 'No document'}
      </p>
      <div className="topbar-spacer" />
      <Button className="bar-button bar-button-primary" onClick={requestImageFilePicker}>
        Open
      </Button>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-label="Choose an image"
        onChange={onFileChange}
      />
    </header>
  )
}

function applePlatform(): boolean {
  return /\b(Mac|iPhone|iPad|iPod)\b/i.test(navigator.userAgent)
}
