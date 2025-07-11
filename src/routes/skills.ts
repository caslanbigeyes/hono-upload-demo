import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const skills = new OpenAPIHono()

// Zod schemas
const SkillSchema = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  yearsOfExp: z.number().optional(),
})

const SkillResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  category: z.string(),
  name: z.string(),
  level: z.string(),
  yearsOfExp: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('Skill')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取简历的专业技能列表
skills.get('/:resumeId', jwtMiddleware, async (c) => {
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

    const skillList = await prisma.skill.findMany({
      where: { resumeId },
      orderBy: { category: 'asc' }
    })

    return c.json(skillList.map(skill => ({
      id: skill.id,
      resumeId: skill.resumeId,
      category: skill.category,
      name: skill.name,
      level: skill.level,
      yearsOfExp: skill.yearsOfExp,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    })))
  } catch (error) {
    console.error('Get skills error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建专业技能
skills.post('/:resumeId', jwtMiddleware, async (c) => {
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

    const { category, name, level, yearsOfExp } = body

    if (!category || !name) {
      return c.json({ error: 'Category and name are required' }, 400)
    }

    const skill = await prisma.skill.create({
      data: {
        resumeId,
        category,
        name,
        level: level || 'intermediate',
        yearsOfExp
      }
    })

    return c.json({
      id: skill.id,
      resumeId: skill.resumeId,
      category: skill.category,
      name: skill.name,
      level: skill.level,
      yearsOfExp: skill.yearsOfExp,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    }, 201)
  } catch (error) {
    console.error('Create skill error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新专业技能
skills.put('/:resumeId/:skillId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const skillId = c.req.param('skillId')
    const body = await c.req.json()

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const { category, name, level, yearsOfExp } = body

    const skill = await prisma.skill.update({
      where: { id: skillId, resumeId },
      data: {
        category,
        name,
        level,
        yearsOfExp
      }
    })

    return c.json({
      id: skill.id,
      resumeId: skill.resumeId,
      category: skill.category,
      name: skill.name,
      level: skill.level,
      yearsOfExp: skill.yearsOfExp,
      createdAt: skill.createdAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update skill error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除专业技能
skills.delete('/:resumeId/:skillId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const skillId = c.req.param('skillId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: currentUser.userId }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    await prisma.skill.delete({
      where: { id: skillId, resumeId }
    })

    return c.json({ message: 'Skill deleted successfully' })
  } catch (error) {
    console.error('Delete skill error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 批量创建技能
skills.post('/:resumeId/batch', jwtMiddleware, async (c) => {
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

    const { skills: skillsData } = body

    if (!Array.isArray(skillsData) || skillsData.length === 0) {
      return c.json({ error: 'Skills array is required' }, 400)
    }

    const createdSkills = await prisma.skill.createMany({
      data: skillsData.map((skill: any) => ({
        resumeId,
        category: skill.category,
        name: skill.name,
        level: skill.level || 'intermediate',
        yearsOfExp: skill.yearsOfExp
      }))
    })

    return c.json({ message: `${createdSkills.count} skills created successfully` }, 201)
  } catch (error) {
    console.error('Batch create skills error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default skills
