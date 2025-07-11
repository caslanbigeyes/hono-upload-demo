import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const projects = new OpenAPIHono()

// Zod schemas
const ProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  role: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  url: z.string().optional(),
  github: z.string().optional(),
  achievements: z.array(z.string()).optional(),
})

const ProjectResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  role: z.string().nullable(),
  technologies: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  url: z.string().nullable(),
  github: z.string().nullable(),
  achievements: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('Project')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取简历的项目经验列表
projects.get('/:resumeId', jwtMiddleware, async (c) => {
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

    const projectList = await prisma.project.findMany({
      where: { resumeId },
      orderBy: { startDate: 'desc' }
    })

    return c.json(projectList.map(project => ({
      id: project.id,
      resumeId: project.resumeId,
      name: project.name,
      description: project.description,
      role: project.role,
      technologies: project.technologies,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString() || null,
      isCurrent: project.isCurrent,
      url: project.url,
      github: project.github,
      achievements: project.achievements,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })))
  } catch (error) {
    console.error('Get projects error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建项目经验
projects.post('/:resumeId', jwtMiddleware, async (c) => {
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

    const { name, description, role, technologies, startDate, endDate, isCurrent, url, github, achievements } = body

    if (!name || !startDate) {
      return c.json({ error: 'Name and startDate are required' }, 400)
    }

    const project = await prisma.project.create({
      data: {
        resumeId,
        name,
        description,
        role,
        technologies: technologies && technologies.length > 0 ? JSON.stringify(technologies) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        url,
        github,
        achievements: achievements && achievements.length > 0 ? JSON.stringify(achievements) : null
      }
    })

    return c.json({
      id: project.id,
      resumeId: project.resumeId,
      name: project.name,
      description: project.description,
      role: project.role,
      technologies: project.technologies,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString() || null,
      isCurrent: project.isCurrent,
      url: project.url,
      github: project.github,
      achievements: project.achievements,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }, 201)
  } catch (error) {
    console.error('Create project error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新项目经验
projects.put('/:resumeId/:projectId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const projectId = c.req.param('projectId')
    const body = await c.req.json()

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const { name, description, role, technologies, startDate, endDate, isCurrent, url, github, achievements } = body

    const project = await prisma.project.update({
      where: { id: projectId, resumeId },
      data: {
        name,
        description,
        role,
        technologies: technologies && technologies.length > 0 ? JSON.stringify(technologies) : null,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent,
        url,
        github,
        achievements: achievements && achievements.length > 0 ? JSON.stringify(achievements) : null
      }
    })

    return c.json({
      id: project.id,
      resumeId: project.resumeId,
      name: project.name,
      description: project.description,
      role: project.role,
      technologies: project.technologies,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString() || null,
      isCurrent: project.isCurrent,
      url: project.url,
      github: project.github,
      achievements: project.achievements,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update project error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除项目经验
projects.delete('/:resumeId/:projectId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const projectId = c.req.param('projectId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    await prisma.project.delete({
      where: { id: projectId, resumeId }
    })

    return c.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Delete project error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default projects
