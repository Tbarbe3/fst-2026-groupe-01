import { Outlet } from 'react-router'

import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

/** Navigation et pied de page communs à toutes les pages. */
export default function SiteLayout() {
  return (
    <div className="landing-page">
      <SiteHeader />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
