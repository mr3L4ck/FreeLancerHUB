import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody, validateQuery, validateParams } from '../middleware/validateRequest.ts'

const router = Router()

const clientSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  job_title: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  billing_address: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['lead', 'prospect', 'customer', 'inactive', 'archived']).default('lead'),
  tags: z.array(z.string()).optional(),
  internal_notes: z.string().optional(),
})

const clientIdSchema = z.object({
  id: z.string().uuid(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// GET /api/clients - List clients
router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, search, status, sortBy, sortOrder } = req.query as any
  const userId = req.user!.id
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) throw new AppError(500, error.message)

  res.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}))

// GET /api/clients/:id - Get single client
router.get('/:id', validateParams(clientIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new AppError(404, 'Client not found')
  if (!data) throw new AppError(404, 'Client not found')

  res.json({ data })
}))

// POST /api/clients - Create client
router.post('/', validateBody(clientSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const clientData = { ...req.body, user_id: userId }

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert(clientData)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)

  res.status(201).json({ data })
}))

// PUT /api/clients/:id - Update client
router.put('/:id', validateParams(clientIdSchema), validateBody(clientSchema.partial()), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('clients')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'Client not found')

  res.json({ data })
}))

// DELETE /api/clients/:id - Delete client
router.delete('/:id', validateParams(clientIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new AppError(500, error.message)

  res.json({ message: 'Client deleted successfully' })
}))

export default router