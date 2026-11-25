import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin, AuthenticatedRequest } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody, validateQuery, validateParams } from '../middleware/validateRequest.ts'

const router = Router()

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  project_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'review', 'completed', 'cancelled']).default('todo'),
  estimated_hours: z.number().positive().optional(),
  actual_hours: z.number().min(0).default(0),
})

const taskIdSchema = z.object({ id: z.string().uuid() })
const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  project_id: z.string().uuid().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, search, status, priority, project_id, sortBy, sortOrder } = req.query as any
  const userId = req.user!.id
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('tasks')
    .select('*, projects(name), clients(full_name)', { count: 'exact' })
    .eq('user_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (project_id) query = query.eq('project_id', project_id)

  const { data, error, count } = await query
  if (error) throw new AppError(500, error.message)

  res.json({ data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } })
}))

router.get('/:id', validateParams(taskIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, projects(*), clients(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) throw new AppError(404, 'Task not found')
  res.json({ data })
}))

router.post('/', validateBody(taskSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({ ...req.body, user_id: userId })
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  res.status(201).json({ data })
}))

router.put('/:id', validateParams(taskIdSchema), validateBody(taskSchema.partial()), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new AppError(500, error.message)
  if (!data) throw new AppError(404, 'Task not found')
  res.json({ data })
}))

router.delete('/:id', validateParams(taskIdSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user!.id

  const { error } = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new AppError(500, error.message)
  res.json({ message: 'Task deleted successfully' })
}))

export default router