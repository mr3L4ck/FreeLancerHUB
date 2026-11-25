import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Invoices() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Create and manage invoices</p>
        </div>
        <Button asChild>
          <Link to="/invoices/new"><Plus className="mr-2 h-4 w-4" />New Invoice</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
            <p className="text-muted-foreground mb-4">Create your first invoice to get paid.</p>
            <Button asChild>
              <Link to="/invoices/new">Create Invoice</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}