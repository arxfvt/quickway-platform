import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: 'red', whiteSpace: 'pre-wrap' }}>
          <h2>Render Error</h2>
          <p>{err.message}</p>
          <pre style={{ fontSize: '0.75rem', color: '#666' }}>{err.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
