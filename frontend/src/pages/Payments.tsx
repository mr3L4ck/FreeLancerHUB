import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Payments() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Track and record payments</p>
        </div>
        <Button asChild>
          <Link to="/payments/new"><Plus className="mr-2 h-4 w-4" />Record Payment</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments recorded</h3>
            <p className="text-muted-foreground mb-4">Record your first payment.</p>
            <Button asChild>
              <Link to="/payments/new">Record Payment</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}