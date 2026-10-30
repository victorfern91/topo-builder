import * as stylex from '@stylexjs/stylex'
import { Toast } from '@base-ui/react/toast'
import { useEffect, type ReactNode } from 'react'
import { t } from '../i18n/index.ts'
import { preferencesSchemaReset } from '../state/preferences.ts'
import { color, media } from '../styles/tokens.stylex.ts'

export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <SchemaResetToast />
      <Toast.Portal>
        <ToastList />
      </Toast.Portal>
    </Toast.Provider>
  )
}

function SchemaResetToast() {
  const manager = Toast.useToastManager()

  useEffect(() => {
    if (!preferencesSchemaReset) return
    const id = manager.add({
      title: t('settingsResetTitle'),
      description: t('settingsResetBody'),
      priority: 'high',
      timeout: 0,
    })
    return () => {
      manager.close(id)
    }
  }, [manager])

  return null
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return (
    <Toast.Viewport {...stylex.props(styles.viewport)} aria-label={t('notifications')}>
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast} {...stylex.props(styles.toast)}>
          <Toast.Content {...stylex.props(styles.content)}>
            <div {...stylex.props(styles.head)}>
              <Toast.Title {...stylex.props(styles.title)} />
              <Toast.Close {...stylex.props(styles.close)}>{t('dismiss')}</Toast.Close>
            </div>
            <Toast.Description {...stylex.props(styles.description)} />
          </Toast.Content>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  )
}

const styles = stylex.create({
  viewport: {
    position: 'fixed',
    right: 16,
    bottom: 16,
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: 'min(360px, calc(100vw - 32px))',
    margin: 0,
    padding: 0,
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: 2,
    pointerEvents: 'none',
  },
  toast: {
    width: '100%',
    pointerEvents: 'auto',
    backgroundColor: color.menu,
    color: color.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.menuLine,
    borderRadius: 6,
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
    opacity: {
      default: 1,
      '[data-starting-style]': 0,
      '[data-ending-style]': 0,
    },
    transform: {
      default: 'translateY(0)',
      '[data-starting-style]': 'translateY(8px)',
      '[data-ending-style]': 'translateY(8px)',
    },
    transitionProperty: 'opacity, transform',
    transitionDuration: {
      default: '180ms',
      [media.reduceMotion]: '0s',
    },
    transitionTimingFunction: 'ease',
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: 2,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 12,
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1.3,
  },
  description: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.4,
    color: color.kbd,
  },
  close: {
    appearance: 'none',
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: 0,
    backgroundColor: {
      default: 'transparent',
      ':hover': 'rgba(255, 255, 255, 0.08)',
    },
    color: 'inherit',
    height: 28,
    paddingBlock: 0,
    paddingInline: 10,
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: 1,
  },
})
