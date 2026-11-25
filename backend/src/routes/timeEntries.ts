import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody, validateQuery, validateParams } from '../middleware/validateRequest.ts'

const router = Router()

const timeEntrySchema = z.object({
  project_id: z.string().uuid(),
  task_id: z.string().uuid().optional(),
  date: z.string().datetime(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_minutes: z.number().positive(),
  hourly_rate: z.number().min(0).optional(),
  description: z.string().optional(),
  billable: z.boolean().default(true),
})

const timeEntryIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  project_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  billable: z.coerce.boolean().optional(),
  sortBy: z.string().default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, project_id, task_id, start_date, end_date, billable, sortBy, sortOrder } = req.query as any
  const userId = req.user!.id
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('time_entries')
    .select('*, projects(name), tasks(title)', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (project_id) query = query.eq('project_id', project_id)
  if (task_id) query = query.eq('task_id', task_id)
  if (start_date) query = query.gte('date', start_date)
  if (end_date) query = query.lte('date', end_date)
  if (billable !== undefined) query = query.eq('billable', billable)

  const { data, error, count } = await query
  if (error) throw new AppError(500, error.message)

  res.json({ data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
}))

router.get('/:id', validateParams(timeEntryIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('time_entries')
    .select('*, projects(*), tasks(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new AppError(404, 'Time entry not found')
  res.json({ data })
}))

router.post('/', validateBody(timeEntrySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const { data, error } = await supabaseAdmin
    .from('time_entries')
    .insert({ ...req.body, user_id: userId })
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  res.status(201).json({ data })
}))

router.put('/:id', validateParams(timeEntryIdSchema), validateBody(timeEntrySchema.partial()), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('time_entries')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'Time entry not found')
  res.json({ data })
}))

router.delete('/:id', validateParams(timeEntryIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('time_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new AppError(500, error.message)
  res.json({ message: 'Time entry deleted successfully' })
}))

export default router