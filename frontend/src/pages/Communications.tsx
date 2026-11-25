import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Communications() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications</h1>
          <p className="text-muted-foreground">Log client communications</p>
        </div>
        <Button asChild>
          <Link to="/communications/new"><Plus className="mr-2 h-4 w-4" />Log Communication</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No communications logged</h3>
            <p className="text-muted-foreground mb-4">Log your first communication.</p>
            <Button asChild>
              <Link to="/communications/new">Log Communication</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}