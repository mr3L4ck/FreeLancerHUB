import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, CheckSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Tasks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Track and manage your tasks</p>
        </div>
        <Button asChild>
          <Link to="/tasks/new"><Plus className="mr-2 h-4 w-4" />New Task</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">Create your first task to get started.</p>
            <Button asChild>
              <Link to="/tasks/new">Create Task</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}