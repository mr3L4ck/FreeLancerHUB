import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { User, Shield, Bell, Palette, Database } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function Settings() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs activeValue={activeTab} onChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" activeValue={activeTab} onChange={setActiveTab}><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security" activeValue={activeTab} onChange={setActiveTab}><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="notifications" activeValue={activeTab} onChange={setActiveTab}><Bell className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="appearance" activeValue={activeTab} onChange={setActiveTab}><Palette className="mr-2 h-4 w-4" />Appearance</TabsTrigger>
          <TabsTrigger value="data" activeValue={activeTab} onChange={setActiveTab}><Database className="mr-2 h-4 w-4" />Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" activeValue={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={user?.user_metadata?.full_name || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input id="businessName" placeholder="Your business name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Freelancer Category</Label>
                <Input id="category" placeholder="e.g., Web Developer, Designer, Writer" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="United States" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" defaultValue="USD" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Time Zone</Label>
                  <Input id="timezone" defaultValue="UTC" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" activeValue={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input id="confirmNewPassword" type="password" />
                  </div>
                  <Button>Update Password</Button>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
                <p className="text-muted-foreground mb-4">Add an extra layer of security to your account.</p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" activeValue={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Configure how you want to be notified.</p>
              <div className="space-y-4">
                {[
                  { label: 'Email notifications', description: 'Receive email updates' },
                  { label: 'Task reminders', description: 'Get reminded of upcoming tasks' },
                  { label: 'Invoice reminders', description: 'Notifications for due invoices' },
                  { label: 'Payment confirmations', description: 'When payments are received' },
                  { label: 'Weekly reports', description: 'Weekly business summary' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Button variant="outline" size="sm">On</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" activeValue={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-4">
                  <Button variant="outline">Light</Button>
                  <Button variant="outline">Dark</Button>
                  <Button variant="outline">System</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Density</Label>
                <div className="flex gap-4">
                  <Button variant="outline">Comfortable</Button>
                  <Button variant="outline">Compact</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" activeValue={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Export Data</h3>
                <p className="text-muted-foreground mb-4">Download all your data in JSON format.</p>
                <Button variant="outline">Export Data</Button>
              </div>
              <Separator />
              <div className="border-destructive/50">
                <h3 className="font-medium text-destructive mb-4">Danger Zone</h3>
                <p className="text-muted-foreground mb-4">Once deleted, your account and all data cannot be recovered.</p>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}