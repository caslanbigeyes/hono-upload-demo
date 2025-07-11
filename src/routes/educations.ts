import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const educations = new OpenAPIHono()

// Zod schemas
const EducationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  major: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  gpa: z.string().optional(),
  description: z.string().optional(),
})

const EducationResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  school: z.string(),
  degree: z.string(),
  major: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  gpa: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('Education')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取简历的教育经历列表
educations.get('/:resumeId', jwtMiddleware, async (c) => {
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

    const educationList = await prisma.education.findMany({
      where: { resumeId },
      orderBy: { startDate: 'desc' }
    })

    return c.json(educationList.map(education => ({
      id: education.id,
      resumeId: education.resumeId,
      school: education.school,
      degree: education.degree,
      major: education.major,
      startDate: education.startDate.toISOString(),
      endDate: education.endDate?.toISOString() || null,
      isCurrent: education.isCurrent,
      gpa: education.gpa,
      description: education.description,
      createdAt: education.createdAt.toISOString(),
      updatedAt: education.updatedAt.toISOString(),
    })))
  } catch (error) {
    console.error('Get educations error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建教育经历
educations.post('/:resumeId', jwtMiddleware, async (c) => {
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

    const { school, degree, major, startDate, endDate, isCurrent, gpa, description } = body

    if (!school || !degree || !major || !startDate) {
      return c.json({ error: 'School, degree, major and startDate are required' }, 400)
    }

    const education = await prisma.education.create({
      data: {
        resumeId,
        school,
        degree,
        major,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        gpa,
        description
      }
    })

    return c.json({
      id: education.id,
      resumeId: education.resumeId,
      school: education.school,
      degree: education.degree,
      major: education.major,
      startDate: education.startDate.toISOString(),
      endDate: education.endDate?.toISOString() || null,
      isCurrent: education.isCurrent,
      gpa: education.gpa,
      description: education.description,
      createdAt: education.createdAt.toISOString(),
      updatedAt: education.updatedAt.toISOString(),
    }, 201)
  } catch (error) {
    console.error('Create education error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新教育经历
educations.put('/:resumeId/:educationId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const educationId = c.req.param('educationId')
    const body = await c.req.json()

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const { school, degree, major, startDate, endDate, isCurrent, gpa, description } = body

    const education = await prisma.education.update({
      where: { id: educationId, resumeId },
      data: {
        school,
        degree,
        major,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent,
        gpa,
        description
      }
    })

    return c.json({
      id: education.id,
      resumeId: education.resumeId,
      school: education.school,
      degree: education.degree,
      major: education.major,
      startDate: education.startDate.toISOString(),
      endDate: education.endDate?.toISOString() || null,
      isCurrent: education.isCurrent,
      gpa: education.gpa,
      description: education.description,
      createdAt: education.createdAt.toISOString(),
      updatedAt: education.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update education error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除教育经历
educations.delete('/:resumeId/:educationId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const educationId = c.req.param('educationId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    await prisma.education.delete({
      where: { id: educationId, resumeId }
    })

    return c.json({ message: 'Education deleted successfully' })
  } catch (error) {
    console.error('Delete education error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default educations
