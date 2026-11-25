import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody, validateQuery, validateParams } from '../middleware/validateRequest.ts'

const router = Router()

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unit_price: z.number().min(0),
  discount: z.number().min(0).max(100).default(0),
  tax_rate: z.number().min(0).max(100).default(0),
})

const invoiceSchema = z.object({
  client_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  issue_date: z.string().datetime(),
  due_date: z.string().datetime(),
  currency: z.string().length(3).default('USD'),
  items: z.array(invoiceItemSchema).min(1),
  notes: z.string().optional(),
  payment_instructions: z.string().optional(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void']).default('draft'),
})

const invoiceIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  client_id: z.string().uuid().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

function calculateInvoiceTotals(items: any[]) {
  const subtotal = items.reduce((sum, item: any) => {
    const itemTotal = item.quantity * item.unit_price
    const discount = itemTotal * (item.discount / 100)
    return sum + itemTotal - discount
  }, 0)

  const taxAmount = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price
    const discount = itemTotal * (item.discount / 100)
    const taxable = itemTotal - discount
    return sum + taxable * (item.tax_rate / 100)
  }, 0)

  return { subtotal, taxAmount, total: subtotal + taxAmount }
}

router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, search, status, client_id, sortBy, sortOrder } = req.query as any
  const userId = req.user!.id
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('invoices')
    .select('*, clients(full_name, email, company_name), projects(name)', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (search) query = query.or(`invoice_number.ilike.%${search}%,notes.ilike.%${search}%`)
  if (status) query = query.eq('status', status)
  if (client_id) query = query.eq('client_id', client_id)

  const { data, error, count } = await query
  if (error) throw new AppError(500, error.message)

  res.json({ data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
}))

router.get('/:id', validateParams(invoiceIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, clients(*), projects(*), invoice_items(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new AppError(404, 'Invoice not found')

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('invoice_id', id)

  res.json({ data: { ...invoice, payments: payments || [] } })
}))

router.post('/', validateBody(invoiceSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const { items, ...invoiceData } = req.body

  const totals = calculateInvoiceTotals(items)

  // Generate invoice number
  const { count } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(6, '0')}`

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      ...invoiceData,
      user_id: userId,
      invoice_number: invoiceNumber,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total_amount: totals.total,
    })
    .select()
    .single()

  if (error) throw new AppError(500, error.message)

  // Insert invoice items
  const itemsWithInvoiceId = items.map((item: any) => ({
    ...item,
    invoice_id: invoice.id,
    line_total: item.quantity * item.unit_price * (1 - item.discount / 100) * (1 + item.tax_rate / 100),
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(itemsWithInvoiceId)

  if (itemsError) throw new AppError(500, itemsError.message)

  res.status(201).json({ data: { ...invoice, items: itemsWithInvoiceId } })
}))

router.put('/:id', validateParams(invoiceIdSchema), validateBody(invoiceSchema.partial()), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id
  const { items, ...invoiceData } = req.body

  let updateData = { ...invoiceData, updated_at: new Date().toISOString() }

  if (items) {
    const totals = calculateInvoiceTotals(items)
    updateData = { ...updateData, subtotal: totals.subtotal, tax_amount: totals.taxAmount, total_amount: totals.total }
  }

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'Invoice not found')

  if (items) {
    await supabaseAdmin.from('invoice_items').delete().eq('invoice_id', id)
    const itemsWithInvoiceId = items.map((item: any) => ({
      ...item,
      invoice_id: id,
      line_total: item.quantity * item.unit_price * (1 - item.discount / 100) * (1 + item.tax_rate / 100),
    }))
    await supabaseAdmin.from('invoice_items').insert(itemsWithInvoiceId)
  }

  res.json({ data })
}))

router.delete('/:id', validateParams(invoiceIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new AppError(500, error.message)
  res.json({ message: 'Invoice deleted successfully' })
}))

export default router