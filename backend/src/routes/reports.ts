import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateQuery } from '../middleware/validateRequest.ts'

const router = Router()

const dateRangeSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
})

router.get('/dashboard', validateQuery(dateRangeSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date } = req.query as any
  const userId = req.user!.id

  const today = new Date().toISOString().split('T')[0]

  // Get metrics in parallel
  const metrics = await Promise.all([
    // Clients
    supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'customer'),

    // Projects
    supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'in_progress'),

    // Tasks
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'todo'),

    // Invoices - total revenue
    supabaseAdmin
      .from('invoices')
      .select('total_amount', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'paid'),

    // Invoices - unpaid
    supabaseAdmin
      .from('invoices')
      .select('total_amount', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', ['draft', 'sent', 'partially_paid', 'overdue']),

    // Overdue invoices
    supabaseAdmin
      .from('invoices')
      .select('total_amount', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'overdue'),

    // Time entries
    supabaseAdmin
      .from('time_entries')
      .select('duration_minutes', { count: 'exact' })
      .eq('user_id', userId)
      .gte('date', today),

    // Communications
    supabaseAdmin
      .from('communications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId),
  ])

  const [
    clientsRes, projectsRes, tasksRes,
    paidInvRes, unpaidInvRes, overdueInvRes,
    timeRes, commRes
  ] = metrics

  if (clientsRes.error || projectsRes.error || tasksRes.error ||
      paidInvRes.error || unpaidInvRes.error || overdueInvRes.error ||
      timeRes.error || commRes.error) {
    throw new AppError(500, 'Failed to fetch metrics')
  }

  const overdueAmount = overdueInvRes.data?.[0]?.total_amount || 0

  // Calculate invoices
  const paidAmount = paidInvRes.data?.[0]?.total_amount || 0
  const unpaidAmount = unpaidInvRes.data?.[0]?.total_amount || 0

  let totalTrackedHours = 0
  if (timeRes.data) {
    totalTrackedHours = (timeRes.data[0]?.duration_minutes || 0) / 60
  }

  // Outstanding payments
  const { data: outstandingPayments, error: outErr } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('user_id', userId)
    .eq('invoice_id', null)

  const outstandingBalance = outstandingPayments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0

  res.json({
    stats: {
      total_clients: clientsRes.data?.length || 0,
      active_projects: projectsRes.data?.length || 0,
      pending_tasks: tasksRes.data?.length || 0,
      total_revenue: paidAmount,
      total_outstanding: unpaidAmount,
      overdue_invoices: overdueAmount,
      total_tracked_hours: totalTrackedHours,
      outstanding_payments: outstandingBalance,
    },
    recent_activities: commRes.data?.slice(0, 5) || [],
  })
}))

router.get('/revenue', validateQuery(dateRangeSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date } = req.query as any
  const userId = req.user!.id
  const today = new Date().toISOString().split('T')[0]

  let query = supabaseAdmin
    .from('invoices')
    .select('total_amount, status, issue_date')
    .eq('user_id', userId)
    .gte('issue_date', start_date || '2024-01-01')
    .lte('issue_date', end_date || today)

  const { data, error, count } = await query
  if (error) throw new AppError(500, error.message)

  // Group by month
  const monthlyRevenue: Record<string, number> = {}
  const paidInvoices = data?.filter((inv: any) => inv.status === 'paid') || []

  paidInvoices.forEach((inv: any) => {
    const month = inv.issue_date?.split('T')[0]?.slice(0, 7) || 'unknown'
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.total_amount || 0)
  })

  res.json({
    revenue: Object.entries(monthlyRevenue).map(([month, amount]) => ({ month, amount })),
    total: Object.values(monthlyRevenue).reduce((a: number, b: number) => a + b, 0),
    totalCount: paidInvoices.length,
  })
}))

router.get('/productivity', validateQuery(dateRangeSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date } = req.query as any
  const userId = req.user!.id

  const today = new Date().toISOString().split('T')[0]

  const [tasks, timeEntries, projects] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('status')
      .eq('user_id', userId)
      .gte('created_at', start_date || '2024-01-01')
      .lte('created_at', end_date || today),

    supabaseAdmin
      .from('time_entries')
      .select('billable, duration_minutes')
      .eq('user_id', userId)
      .gte('date', start_date || '2024-01-01')
      .lte('date', end_date || today),

    supabaseAdmin
      .from('projects')
      .select('status')
      .eq('user_id', userId)
      .gte('created_at', start_date || '2024-01-01')
      .lte('created_at', end_date || today),
  ])

  const tasksData = tasks?.data || []
  const timeData = timeEntries?.data || []
  const projectsData = projects?.data || []

  const completedTasks = tasksData.filter((t: any) => t.status === 'completed').length
  const overdueTasks = tasksData.filter((t: any) => t.status === 'todo' && t.due_date && t.due_date < today).length

  const billableHours = timeData
    .filter((te: any) => te.billable && te.duration_minutes)
    .reduce((sum: number, te: any) => sum + (te.duration_minutes || 0), 0) / 60

  const totalHours = timeData
    .filter((te: any) => te.duration_minutes)
    .reduce((sum: number, te: any) => sum + (te.duration_minutes || 0), 0) / 60

  const projectCompletion = projectsData.reduce((acc: Record<string, number>, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  res.json({
    completed_tasks: completedTasks,
    overdue_tasks: overdueTasks,
    total_hours: Math.round(totalHours * 10) / 10,
    billable_hours: Math.round(billableHours * 10) / 10,
    non_billable_hours: Math.round((totalHours - billableHours) * 10) / 10,
    project_completions: projectCompletion,
  })
}))

router.get('/clients', validateQuery(dateRangeSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date } = req.query as any
  const userId = req.user!.id

  const today = new Date().toISOString().split('T')[0]

  const { data: clients, error } = await supabaseAdmin
    .from('clients')
    .select('*, payments(amount), invoices(total_amount)')
    .eq('user_id', userId)
    .gte('created_at', start_date || '2024-01-01')
    .lte('created_at', end_date || today)

  if (error) throw new AppError(500, error.message)

  const clientData = clients || []

  const clientStats = clientData.map((client: any) => {
    const clientPayments = client.payments || []
    const totalInvoiced = client.invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0
    const totalPaid = clientPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    const outstanding = totalInvoiced - totalPaid

    return {
      id: client.id,
      full_name: client.full_name,
      email: client.email,
      company_name: client.company_name,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      outstanding_balance: outstanding,
      created_at: client.created_at,
    }
  })

  res.json({
    clients: clientStats,
    total: clientStats.length,
  })
}))

router.get('/projects', validateQuery(dateRangeSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { start_date, end_date } = req.query as any
  const userId = req.user!.id
  const today = new Date().toISOString().split('T')[0]

  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select('*, clients(full_name), invoices(total_amount), time_entries(duration_minutes)')
    .eq('user_id', userId)
    .gte('created_at', start_date || '2024-01-01')
    .lte('created_at', end_date || today)

  if (error) throw new AppError(500, error.message)

  const projectData = projects || []

  const projectStats = projectData.map((project: any) => {
    const totalInvoice = project.invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0
    const totalHours = project.time_entries?.reduce((sum: number, te: any) => sum + (te.duration_minutes || 0), 0) / 60 || 0
    const totalBudget = project.budget || 0
    const totalSpent = Math.round(totalInvoice / 100) / 10
    const progressPercent = Math.min(Math.round((totalSpent / totalBudget) * 100), 100)

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      client: project.clients?.full_name,
      budget: totalBudget,
      spent: totalSpent,
      progress_percent: progressPercent,
      hours_tracked: Math.round(totalHours * 10) / 10,
      due_date: project.due_date,
    }
  })

  res.json({
    projects: projectStats,
    total: projectStats.length,
  })
}))

router.get('/csv/:reportType', validateQuery(dateRangeSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { reportType } = req.params
  const { start_date, end_date } = req.query as any
  const userId = req.user!.id
  const today = new Date().toISOString().split('T')[0]

  let data: any[] = []
  let filename: string

  switch (reportType) {
    case 'clients':
      const { data: clients, error: err1 } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', start_date || '2024-01-01')
        .lte('created_at', end_date || today)
      if (err1) throw new AppError(500, err1.message)
      data = clients || []
      filename = 'clients.csv'
      break

    case 'projects':
      const { data: projects, error: err2 } = await supabaseAdmin
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', start_date || '2024-01-01')
        .lte('created_at', end_date || today)
      if (err2) throw new AppError(500, err2.message)
      data = projects || []
      filename = 'projects.csv'
      break

    case 'time_entries':
      const { data: entries, error: err3 } = await supabaseAdmin
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start_date || '2024-01-01')
        .lte('date', end_date || today)
      if (err3) throw new AppError(500, err3.message)
      data = entries || []
      filename = 'time_entries.csv'
      break

    case 'invoices':
      const { data: invoices, error: err4 } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .gte('issue_date', start_date || '2024-01-01')
        .lte('issue_date', end_date || today)
      if (err4) throw new AppError(500, err4.message)
      data = invoices || []
      filename = 'invoices.csv'
      break

    default:
      throw new AppError(400, 'Invalid report type')
  }

  // Generate CSV
  const headers = Object.keys(data[0] || {}).join(',')
  const rows = data.map((row: any) => Object.values(row).map((v: any) => `"${v}"`).join(','))
  const csv = [headers, ...rows].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
}))

export default router