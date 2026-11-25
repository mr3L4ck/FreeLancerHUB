import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderKanban, CheckSquare, FileText, CreditCard, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

const stats = [
  { name: 'Total Clients', value: '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Active Projects', value: '0', icon: FolderKanban, color: 'text-green-500', bg: 'bg-green-500/10' },
  { name: 'Pending Tasks', value: '0', icon: CheckSquare, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { name: 'Total Revenue', value: '$0', icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { name: 'Outstanding', value: '$0', icon: CreditCard, color: 'text-red-500', bg: 'bg-red-500/10' },
  { name: 'Tracked Hours', value: '0h', icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
]

const quickActions = [
  { name: 'Add Client', href: '/clients/new', icon: Users },
  { name: 'Create Project', href: '/projects/new', icon: FolderKanban },
  { name: 'Create Task', href: '/tasks/new', icon: CheckSquare },
  { name: 'Create Invoice', href: '/invoices/new', icon: FileText },
  { name: 'Start Timer', href: '/time-tracking', icon: Clock },
  { name: 'Record Payment', href: '/payments/new', icon: CreditCard },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your freelance business</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={cn('h-4 w-4', stat.color, stat.bg, 'p-2 rounded-lg')} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Card key={action.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <action.icon className="h-8 w-8 text-primary mb-2" />
              <span className="text-sm font-medium text-center">{action.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">No projects yet. Create your first project!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">No upcoming deadlines.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}