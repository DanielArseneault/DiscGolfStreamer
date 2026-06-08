import { Outlet, NavLink } from 'react-router-dom'

export default function AdminLayout() {
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm font-medium transition-colors ${
      isActive ? 'bg-green-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <span className="font-bold text-green-400 text-lg">Disc Golf Pilot</span>
        <span className="text-gray-500 text-sm">Admin</span>
        <nav className="flex gap-1 ml-auto">
          <NavLink to="/admin/courses" className={link}>Courses</NavLink>
          <NavLink to="/admin/rounds" className={link}>Rounds</NavLink>
        </nav>
      </header>
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
