import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody, validateQuery, validateParams } from '../middleware/validateRequest.ts'

const router = Router()

const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  client_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string().datetime(),
  payment_method: z.enum(['bank_transfer', 'paypal', 'stripe', 'cash', 'other']),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
})

const paymentIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  invoice_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  sortBy: z.string().default('payment_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, invoice_id, client_id, sortBy, sortOrder } = req.query as any
  const userId = req.user!.id
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('payments')
    .select('*, invoices(invoice_number, total_amount), clients(full_name, email)', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (invoice_id) query = query.eq('invoice_id', invoice_id)
  if (client_id) query = query.eq('client_id', client_id)

  const { data, error, count } = await query
  if (error) throw new AppError(500, error.message)

  res.json({ data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
}))

router.get('/:id', validateParams(paymentIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*, invoices(*), clients(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new AppError(404, 'Payment not found')
  res.json({ data })
}))

router.post('/', validateBody(paymentSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const { invoice_id, amount, ...paymentData } = req.body

  // Get invoice to check balance
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .select('total_amount, status, paid_amount')
    .eq('id', invoice_id)
    .eq('user_id', userId)
    .single()

  if (invoiceError) throw new AppError(404, 'Invoice not found')

  const paidAmount = invoice.paid_amount || 0
  const newPaidAmount = paidAmount + amount

  if (newPaidAmount > invoice.total_amount) {
    throw new AppError(400, 'Payment amount exceeds invoice balance')
  }

  // Determine new status
  let newStatus = invoice.status
  if (newPaidAmount >= invoice.total_amount) newStatus = 'paid'
  else if (newPaidAmount > 0) newStatus = 'partially_paid'

  // Use transaction for payment + invoice update
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .insert({ ...paymentData, user_id: userId, invoice_id, amount })
    .select()
    .single()

  if (error) throw new AppError(500, error.message)

  // Update invoice
  await supabaseAdmin
    .from('invoices')
    .update({
      paid_amount: newPaidAmount,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice_id)

  res.status(201).json({ data: payment })
}))

router.put('/:id', validateParams(paymentIdSchema), validateBody(paymentSchema.partial()), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'Payment not found')
  res.json({ data })
}))

router.delete('/:id', validateParams(paymentIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  // Get payment to reverse invoice update
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('invoice_id, amount')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (payment) {
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('total_amount, paid_amount, status')
      .eq('id', payment.invoice_id)
      .single()

    if (invoice) {
      const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - payment.amount)
      let newStatus = 'sent'
      if (newPaidAmount === 0) newStatus = 'sent'
      else if (newPaidAmount >= invoice.total_amount) newStatus = 'paid'
      else newStatus = 'partially_paid'

      await supabaseAdmin
        .from('invoices')
        .update({ paid_amount: newPaidAmount, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', payment.invoice_id)
    }
  }

  const { error } = await supabaseAdmin
    .from('payments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new AppError(500, error.message)
  res.json({ message: 'Payment deleted successfully' })
}))

export default router