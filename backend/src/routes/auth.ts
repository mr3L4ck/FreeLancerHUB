import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from './../middleware/auth.ts'
import { asyncHandler, AppError } from '../middleware/errorHandler.ts'
import { validateBody } from '../middleware/validateRequest.ts'

const router = Router()

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
})

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/signup', validateBody(signUpSchema), asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) {
    throw new AppError(400, error.message)
  }

  // Create profile
  if (data.user) {
    await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  res.status(201).json({ user: data.user, message: 'Account created successfully' })
}))

router.post('/signin', validateBody(signInSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new AppError(401, 'Invalid credentials')
  }

  res.json({
    user: data.user,
    session: data.session,
    message: 'Signed in successfully',
  })
}))

router.post('/signout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    await supabaseAdmin.auth.admin.signOut(token)
  }
  res.json({ message: 'Signed out successfully' })
}))

router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing authorization header')
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    throw new AppError(401, 'Invalid token')
  }

  // Get profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  res.json({ user, profile })
}))

export default router