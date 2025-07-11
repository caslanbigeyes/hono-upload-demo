import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const resumes = new OpenAPIHono()

// 简单的测试路由
resumes.get('/test', (c) => {
  return c.json({ message: 'Resume routes are working!' })
})

// 测试不需要认证的路由
resumes.get('/test-no-auth', (c) => {
  return c.json({ message: 'No auth test working!' })
})

// Zod schemas
const CreateResumeSchema = z.object({
  title: z.string().min(1).max(100),
  template: z.string().default('classic'),
  isDefault: z.boolean().default(false),
})

const UpdateResumeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  template: z.string().optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

const PersonalInfoSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  summary: z.string().optional(),
  objective: z.string().optional(),
})

const ResumeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  isDefault: z.boolean(),
  isPublic: z.boolean(),
  template: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    website: z.string().nullable(),
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
    summary: z.string().nullable(),
    objective: z.string().nullable(),
  }).nullable(),
}).openapi('Resume')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取用户所有简历
const getResumesRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Get User Resumes',
  description: 'Get all resumes for the authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(ResumeResponseSchema),
        },
      },
      description: 'List of user resumes',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
})

// 临时简化版本，不使用 OpenAPI
resumes.get('/', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    console.log(currentUser,'currentUser')
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const userResumes = await prisma.resume.findMany({
      where: { userId: currentUser.userId },
      include: {
        personalInfo: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return c.json(userResumes.map(resume => ({
      id: resume.id,
      title: resume.title,
      isDefault: resume.isDefault,
      isPublic: resume.isPublic,
      template: resume.template,
      status: resume.status,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      personalInfo: resume.personalInfo,
    })))
  } catch (error) {
    console.error('Get resumes error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建新简历 - 简化版本
resumes.post('/', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const body = await c.req.json()
    const { title, template = 'classic', isDefault = false } = body

    if (!title) {
      return c.json({ error: 'Title is required' }, 400)
    }

    // 如果设置为默认简历，先取消其他简历的默认状态
    if (isDefault) {
      await prisma.resume.updateMany({
        where: { userId: currentUser.userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const resume = await prisma.resume.create({
      data: {
        userId: currentUser.userId,
        title,
        template,
        isDefault,
      },
      include: {
        personalInfo: true,
      },
    })

    return c.json({
      id: resume.id,
      title: resume.title,
      isDefault: resume.isDefault,
      isPublic: resume.isPublic,
      template: resume.template,
      status: resume.status,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      personalInfo: resume.personalInfo,
    }, 201)
  } catch (error) {
    console.error('Create resume error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 获取单个简历详情
resumes.get('/:id', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const id = c.req.param('id')
    if (!id) {
      return c.json({ error: 'Resume ID is required' }, 400)
    }

    const resume = await prisma.resume.findFirst({
      where: {
        id,
        userId: currentUser.userId,
      },
      include: {
        personalInfo: true,
        educations: true,
        experiences: true,
        projects: true,
        skills: true,
        certificates: true,
        languages: true,
      },
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    return c.json({
      id: resume.id,
      title: resume.title,
      isDefault: resume.isDefault,
      isPublic: resume.isPublic,
      template: resume.template,
      status: resume.status,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      personalInfo: resume.personalInfo,
      educations: resume.educations,
      experiences: resume.experiences,
      projects: resume.projects,
      skills: resume.skills,
      certificates: resume.certificates,
      languages: resume.languages,
    })
  } catch (error) {
    console.error('Get resume error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建新简历
const createResumeRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create Resume',
  description: 'Create a new resume',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateResumeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ResumeResponseSchema,
        },
      },
      description: 'Resume created successfully',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Unauthorized',
    },
  },
})

resumes.openapi(createResumeRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { title, template, isDefault } = c.req.valid('json')

    // 如果设置为默认简历，先取消其他简历的默认状态
    if (isDefault) {
      await prisma.resume.updateMany({
        where: { userId: currentUser.userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const resume = await prisma.resume.create({
      data: {
        userId: currentUser.userId,
        title,
        template,
        isDefault,
      },
      include: {
        personalInfo: true,
      },
    })

    return c.json({
      id: resume.id,
      title: resume.title,
      isDefault: resume.isDefault,
      isPublic: resume.isPublic,
      template: resume.template,
      status: resume.status,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      personalInfo: resume.personalInfo,
    }, 201)
  } catch (error) {
    console.error('Create resume error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 获取单个简历详情
const getResumeRoute = createRoute({
  method: 'get',
  path: '/{id}',
  summary: 'Get Resume',
  description: 'Get a specific resume by ID',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ResumeResponseSchema,
        },
      },
      description: 'Resume details',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Resume not found',
    },
  },
})

resumes.openapi(getResumeRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { id } = c.req.valid('param')

    const resume = await prisma.resume.findFirst({
      where: { 
        id,
        userId: currentUser.userId,
      },
      include: {
        personalInfo: true,
        educations: true,
        experiences: true,
        projects: true,
        skills: true,
        certificates: true,
        languages: true,
      },
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    return c.json({
      id: resume.id,
      title: resume.title,
      isDefault: resume.isDefault,
      isPublic: resume.isPublic,
      template: resume.template,
      status: resume.status,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      personalInfo: resume.personalInfo,
      educations: resume.educations,
      experiences: resume.experiences,
      projects: resume.projects,
      skills: resume.skills,
      certificates: resume.certificates,
      languages: resume.languages,
    })
  } catch (error) {
    console.error('Get resume error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新简历
const updateResumeRoute = createRoute({
  method: 'put',
  path: '/{id}',
  summary: 'Update Resume',
  description: 'Update a specific resume',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateResumeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ResumeResponseSchema,
        },
      },
      description: 'Resume updated successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Resume not found',
    },
  },
})

resumes.openapi(updateResumeRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { id } = c.req.valid('param')
    const updateData = c.req.valid('json')

    // 检查简历是否存在且属于当前用户
    const existingResume = await prisma.resume.findFirst({
      where: {
        id,
        userId: currentUser.userId,
      },
    })

    if (!existingResume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    // 如果设置为默认简历，先取消其他简历的默认状态
    if (updateData.isDefault) {
      await prisma.resume.updateMany({
        where: {
          userId: currentUser.userId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      })
    }

    const resume = await prisma.resume.update({
      where: { id },
      data: updateData,
      include: {
        personalInfo: true,
      },
    })

    return c.json({
      id: resume.id,
      title: resume.title,
      isDefault: resume.isDefault,
      isPublic: resume.isPublic,
      template: resume.template,
      status: resume.status,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      personalInfo: resume.personalInfo,
    })
  } catch (error) {
    console.error('Update resume error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除简历
const deleteResumeRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Delete Resume',
  description: 'Delete a specific resume',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
      description: 'Resume deleted successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Resume not found',
    },
  },
})

resumes.openapi(deleteResumeRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { id } = c.req.valid('param')

    // 检查简历是否存在且属于当前用户
    const existingResume = await prisma.resume.findFirst({
      where: {
        id,
        userId: currentUser.userId,
      },
    })

    if (!existingResume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    await prisma.resume.delete({
      where: { id },
    })

    return c.json({ message: 'Resume deleted successfully' })
  } catch (error) {
    console.error('Delete resume error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ==================== 工作经历相关接口 ====================

// 获取简历的工作经历列表
resumes.get('/:resumeId/experiences', jwtMiddleware, async (c) => {
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

    const experiences = await prisma.experience.findMany({
      where: { resumeId },
      orderBy: { startDate: 'desc' }
    })

    return c.json(experiences)
  } catch (error) {
    console.error('Get experiences error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建工作经历
resumes.post('/:resumeId/experiences', jwtMiddleware, async (c) => {
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

    return c.json(experience, 201)
  } catch (error) {
    console.error('Create experience error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新工作经历
resumes.put('/:resumeId/experiences/:experienceId', jwtMiddleware, async (c) => {
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

    return c.json(experience)
  } catch (error) {
    console.error('Update experience error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除工作经历
resumes.delete('/:resumeId/experiences/:experienceId', jwtMiddleware, async (c) => {
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

// ==================== 教育经历相关接口 ====================

// 获取简历的教育经历列表
resumes.get('/:resumeId/educations', jwtMiddleware, async (c) => {
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

    const educations = await prisma.education.findMany({
      where: { resumeId },
      orderBy: { startDate: 'desc' }
    })

    return c.json(educations)
  } catch (error) {
    console.error('Get educations error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建教育经历
resumes.post('/:resumeId/educations', jwtMiddleware, async (c) => {
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

    return c.json(education, 201)
  } catch (error) {
    console.error('Create education error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新教育经历
resumes.put('/:resumeId/educations/:educationId', jwtMiddleware, async (c) => {
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

    return c.json(education)
  } catch (error) {
    console.error('Update education error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除教育经历
resumes.delete('/:resumeId/educations/:educationId', jwtMiddleware, async (c) => {
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

// ==================== 项目经验相关接口 ====================

// 获取简历的项目经验列表
resumes.get('/:resumeId/projects', jwtMiddleware, async (c) => {
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

    const projects = await prisma.project.findMany({
      where: { resumeId },
      orderBy: { startDate: 'desc' }
    })

    return c.json(projects)
  } catch (error) {
    console.error('Get projects error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建项目经验
resumes.post('/:resumeId/projects', jwtMiddleware, async (c) => {
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

    return c.json(project, 201)
  } catch (error) {
    console.error('Create project error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新项目经验
resumes.put('/:resumeId/projects/:projectId', jwtMiddleware, async (c) => {
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

    return c.json(project)
  } catch (error) {
    console.error('Update project error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除项目经验
resumes.delete('/:resumeId/projects/:projectId', jwtMiddleware, async (c) => {
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

// ==================== 专业技能相关接口 ====================

// 获取简历的专业技能列表
resumes.get('/:resumeId/skills', jwtMiddleware, async (c) => {
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

    const skills = await prisma.skill.findMany({
      where: { resumeId },
      orderBy: { category: 'asc' }
    })

    return c.json(skills)
  } catch (error) {
    console.error('Get skills error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建专业技能
resumes.post('/:resumeId/skills', jwtMiddleware, async (c) => {
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
        level,
        yearsOfExp
      }
    })

    return c.json(skill, 201)
  } catch (error) {
    console.error('Create skill error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新专业技能
resumes.put('/:resumeId/skills/:skillId', jwtMiddleware, async (c) => {
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

    return c.json(skill)
  } catch (error) {
    console.error('Update skill error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除专业技能
resumes.delete('/:resumeId/skills/:skillId', jwtMiddleware, async (c) => {
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

// ==================== 批量操作接口 ====================

// 批量创建技能
resumes.post('/:resumeId/skills/batch', jwtMiddleware, async (c) => {
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

    const { skills } = body

    if (!Array.isArray(skills) || skills.length === 0) {
      return c.json({ error: 'Skills array is required' }, 400)
    }

    const createdSkills = await prisma.skill.createMany({
      data: skills.map((skill: any) => ({
        resumeId,
        category: skill.category,
        name: skill.name,
        level: skill.level,
        yearsOfExp: skill.yearsOfExp
      }))
    })

    return c.json({ message: `${createdSkills.count} skills created successfully` }, 201)
  } catch (error) {
    console.error('Batch create skills error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default resumes
