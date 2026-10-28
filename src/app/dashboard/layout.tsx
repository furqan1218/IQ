import TopBar from "@/components/Navbar" // Aapka top bar component
import Sidebar from "@/components/sidebar"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const userRole = (session?.user as any)?.role || "ADMIN"

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar (agar use karna ho) */}
      <Sidebar userRole={userRole} />

      {/* Right Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}