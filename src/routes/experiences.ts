import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const experiences = new OpenAPIHono()

// Zod schemas
const ExperienceSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
})

const ExperienceResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  company: z.string(),
  position: z.string(),
  location: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string().nullable(),
  achievements: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('Experience')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取简历的工作经历列表
experiences.get('/:resumeId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const experienceList = await prisma.experience.findMany({
      where: { resumeId },
      orderBy: { startDate: 'desc' }
    })

    return c.json(experienceList.map(experience => ({
      id: experience.id,
      resumeId: experience.resumeId,
      company: experience.company,
      position: experience.position,
      location: experience.location,
      startDate: experience.startDate.toISOString(),
      endDate: experience.endDate?.toISOString() || null,
      isCurrent: experience.isCurrent,
      description: experience.description,
      achievements: experience.achievements,
      createdAt: experience.createdAt.toISOString(),
      updatedAt: experience.updatedAt.toISOString(),
    })))
  } catch (error) {
    console.error('Get experiences error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建工作经历
experiences.post('/:resumeId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const body = await c.req.json()

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const { company, position, location, startDate, endDate, isCurrent, description, achievements } = body

    if (!company || !position || !startDate) {
      return c.json({ error: 'Company, position and startDate are required' }, 400)
    }

    const experience = await prisma.experience.create({
      data: {
        resumeId,
        company,
        position,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        description,
        achievements: achievements && achievements.length > 0 ? JSON.stringify(achievements) : null
      }
    })

    return c.json({
      id: experience.id,
      resumeId: experience.resumeId,
      company: experience.company,
      position: experience.position,
      location: experience.location,
      startDate: experience.startDate.toISOString(),
      endDate: experience.endDate?.toISOString() || null,
      isCurrent: experience.isCurrent,
      description: experience.description,
      achievements: experience.achievements,
      createdAt: experience.createdAt.toISOString(),
      updatedAt: experience.updatedAt.toISOString(),
    }, 201)
  } catch (error) {
    console.error('Create experience error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新工作经历
experiences.put('/:resumeId/:experienceId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const experienceId = c.req.param('experienceId')
    const body = await c.req.json()

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const { company, position, location, startDate, endDate, isCurrent, description, achievements } = body

    const experience = await prisma.experience.update({
      where: { id: experienceId, resumeId },
      data: {
        company,
        position,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent,
        description,
        achievements: achievements && achievements.length > 0 ? JSON.stringify(achievements) : null
      }
    })

    return c.json({
      id: experience.id,
      resumeId: experience.resumeId,
      company: experience.company,
      position: experience.position,
      location: experience.location,
      startDate: experience.startDate.toISOString(),
      endDate: experience.endDate?.toISOString() || null,
      isCurrent: experience.isCurrent,
      description: experience.description,
      achievements: experience.achievements,
      createdAt: experience.createdAt.toISOString(),
      updatedAt: experience.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update experience error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除工作经历
experiences.delete('/:resumeId/:experienceId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const experienceId = c.req.param('experienceId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    await prisma.experience.delete({
      where: { id: experienceId, resumeId }
    })

    return c.json({ message: 'Experience deleted successfully' })
  } catch (error) {
    console.error('Delete experience error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default experiences
