import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateCostingSession, COOKIE_NAME } from '../../../lib/costing-auth'
import { validateSession } from '../../../lib/auth'
import MenuEngineeringClient from './MenuEngineeringClient'

export const metadata = {
  title: 'Menu Engineering — Crown Coffee Admin',
  description: 'Admin dashboard: pricing, menu engineering, and profitability',
}

export default async function MenuEngineeringPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  let session = token ? await validateCostingSession(token) : null

  if (!session) {
    const mainToken = cookieStore.get('cc_token')?.value
    if (mainToken) {
      const mainSession = await validateSession(mainToken)
      if (mainSession && (mainSession.role === 'admin' || mainSession.role === 'sub_admin')) {
        session = { role: 'admin', user_id: mainSession.user_id }
      }
    }
  }

  if (!session) redirect('/menu-costings/login')
  if (session.role !== 'admin') redirect('/menu-costings')

  return <MenuEngineeringClient userId={session.user_id} />
}
