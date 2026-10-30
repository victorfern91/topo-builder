import * as stylex from '@stylexjs/stylex'
import { Outlet } from '@tanstack/react-router'
import { TopBar } from '../components/top-bar.tsx'
import { ViewportProvider } from '../state/viewport-provider.tsx'
import { color } from '../styles/tokens.stylex.ts'

const styles = stylex.create({
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    backgroundColor: color.workspace,
  },
})

export function RootLayout() {
  return (
    <ViewportProvider>
      <div {...stylex.props(styles.app)}>
        <TopBar />
        <Outlet />
      </div>
    </ViewportProvider>
  )
}
