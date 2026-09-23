import App from '@/components/App'

// The whole app is one client-side state machine (landing → questions →
// loading → results); see src/components/App.tsx. /mocks boots the same
// component at any stage.
export default function Home() {
  return <App />
}
