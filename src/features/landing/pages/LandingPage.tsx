import { useEffect } from 'react'
import '../landing.css'
import { PAGE_TITLE } from '../content'
import { useHasSession } from '../hooks'
import { AudienceSection } from '../components/AudienceSection'
import { ChainSection } from '../components/ChainSection'
import { ClosingSection, LandingFooter } from '../components/ClosingSection'
import { EnginesSection } from '../components/EnginesSection'
import { FeaturesBento } from '../components/FeaturesBento'
import { Hero } from '../components/Hero'
import { LandingNav } from '../components/LandingNav'
import { MigrationSection } from '../components/MigrationSection'
import { ProblemSection } from '../components/ProblemSection'
import { TrustSection } from '../components/TrustSection'

/**
 * `/` — la página pública de venta de Prendo. La ve cualquiera, con o sin
 * sesión; con sesión, el nav lleva al panel en vez de al login.
 */
export function LandingPage() {
  const hasSession = useHasSession()

  useEffect(() => {
    const previous = document.title
    document.title = PAGE_TITLE
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div id="top" className="landing min-h-screen overflow-x-clip bg-background font-sans text-foreground">
      <LandingNav hasSession={hasSession} />
      <main>
        <Hero />
        <ProblemSection />
        <ChainSection />
        <EnginesSection />
        <FeaturesBento />
        <AudienceSection />
        <TrustSection />
        <MigrationSection />
        <ClosingSection hasSession={hasSession} />
      </main>
      <LandingFooter hasSession={hasSession} />
    </div>
  )
}
