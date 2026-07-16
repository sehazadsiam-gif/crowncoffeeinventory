import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateCostingSession, COOKIE_NAME } from '../../lib/costing-auth'
import MenuCostingsClient from './MenuCostingsClient'

export const metadata = {
  title: 'Menu Costings — Crown Coffee',
  description: 'Chef ingredient costing and COGS calculation',
}

export default async function MenuCostingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  const session = token ? await validateCostingSession(token) : null
  if (!session) redirect('/menu-costings/login')
  if (!['chef', 'admin'].includes(session.role)) redirect('/menu-costings/login')

  return <MenuCostingsClient sessionRole={session.role} userId={session.user_id} />
}
