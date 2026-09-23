import MockScreen from '@/components/mocks/MockScreen'
import { SCENARIOS } from '@/components/mocks/scenarios'

export const dynamicParams = false

export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ screen: s.id }))
}

export default function MockPage({ params }: { params: { screen: string } }) {
  // keyed so moving between screens starts each one fresh
  return <MockScreen key={params.screen} id={params.screen} />
}
