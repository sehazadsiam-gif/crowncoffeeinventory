import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateCostingSession, COOKIE_NAME } from '../../../lib/costing-auth'
import MenuEngineeringClient from './MenuEngineeringClient'

export const metadata = {
  title: 'Menu Engineering — Crown Coffee Admin',
  description: 'Admin dashboard: pricing, menu engineering, and profitability',
}

export default async function MenuEngineeringPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  const session = token ? await validateCostingSession(token) : null
  if (!session) redirect('/menu-costings/login')
  if (session.role !== 'admin') redirect('/menu-costings')

  return <MenuEngineeringClient userId={session.user_id} />
}
