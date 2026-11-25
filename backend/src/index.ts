import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { errorHandler } from './middleware/errorHandler.ts'
import { authMiddleware } from './middleware/auth.ts'
import { validateRequest } from './middleware/validateRequest.ts'

import clientsRouter from './routes/clients.ts'
import projectsRouter from './routes/projects.ts'
import tasksRouter from './routes/tasks.ts'
import invoicesRouter from './routes/invoices.ts'
import paymentsRouter from './routes/payments.ts'
import timeEntriesRouter from './routes/timeEntries.ts'
import communicationsRouter from './routes/communications.ts'
import reportsRouter from './routes/reports.ts'
import authRouter from './routes/auth.ts'

const app = express()
const PORT = process.env.PORT || 4000

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
})
app.use('/api/', limiter)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging
app.use(morgan('combined'))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRouter)
app.use('/api/clients', authMiddleware, clientsRouter)
app.use('/api/projects', authMiddleware, projectsRouter)
app.use('/api/tasks', authMiddleware, tasksRouter)
app.use('/api/invoices', authMiddleware, invoicesRouter)
app.use('/api/payments', authMiddleware, paymentsRouter)
app.use('/api/time', authMiddleware, timeEntriesRouter)
app.use('/api/communications', authMiddleware, communicationsRouter)
app.use('/api/reports', authMiddleware, reportsRouter)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

export default app