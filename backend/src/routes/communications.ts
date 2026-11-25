import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody, validateQuery, validateParams } from '../middleware/validateRequest.ts'

const router = Router()

const communicationSchema = z.object({
  client_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  type: z.enum(['email', 'phone_call', 'meeting', 'message', 'note', 'other']),
  subject: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(),
  follow_up_date: z.string().datetime().optional(),
})

const communicationIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  type: z.string().optional(),
  sortBy: z.string().default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, client_id, project_id, type, sortBy, sortOrder } = req.query as any
  const userId = req.user!.id
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('communications')
    .select('*, clients(full_name, email), projects(name)', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (client_id) query = query.eq('client_id', client_id)
  if (project_id) query = query.eq('project_id', project_id)
  if (type) query = query.eq('type', type)

  const { data, error, count } = await query
  if (error) throw new AppError(500, error.message)

  res.json({ data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
}))

router.get('/:id', validateParams(communicationIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('communications')
    .select('*, clients(*), projects(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new AppError(404, 'Communication not found')
  res.json({ data })
}))

router.post('/', validateBody(communicationSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const { data, error } = await supabaseAdmin
    .from('communications')
    .insert({ ...req.body, user_id: userId })
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  res.status(201).json({ data })
}))

router.put('/:id', validateParams(communicationIdSchema), validateBody(communicationSchema.partial()), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('communications')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'Communication not found')
  res.json({ data })
}))

router.delete('/:id', validateParams(communicationIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('communications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new AppError(500, error.message)
  res.json({ message: 'Communication deleted successfully' })
}))

export default router