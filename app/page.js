import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import DashboardClient from '../components/DashboardClient'

export const revalidate = 0

// Since we now want historical data selection on the client,
// we will fetch all stats client-side based on the selected date.
// We'll leave server component empty data and do fetching on the client side.

export default function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <DashboardClient />
    </div>
  )
}
