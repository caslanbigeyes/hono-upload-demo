import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const resumes = new OpenAPIHono()

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

resumes.openapi(getResumesRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
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

export default resumes
