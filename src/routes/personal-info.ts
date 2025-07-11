import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const personalInfo = new OpenAPIHono()

// 简化版本的更新个人信息接口
personalInfo.put('/:resumeId', jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const resumeId = c.req.param('resumeId')
    const data = await c.req.json()

    // 验证简历属于当前用户
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: currentUser.userId,
      },
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const info = await prisma.personalInfo.upsert({
      where: { resumeId },
      update: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        website: data.website || null,
        linkedin: data.linkedin || null,
        github: data.github || null,
        summary: data.summary || null,
        objective: data.objective || null,
      },
      create: {
        resumeId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        website: data.website || null,
        linkedin: data.linkedin || null,
        github: data.github || null,
        summary: data.summary || null,
        objective: data.objective || null,
      },
    })

    return c.json({
      id: info.id,
      resumeId: info.resumeId,
      fullName: info.fullName,
      email: info.email,
      phone: info.phone,
      address: info.address,
      city: info.city,
      country: info.country,
      website: info.website,
      linkedin: info.linkedin,
      github: info.github,
      summary: info.summary,
      objective: info.objective,
      createdAt: info.createdAt.toISOString(),
      updatedAt: info.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update personal info error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Zod schemas
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

const PersonalInfoResponseSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
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
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('PersonalInfo')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取个人信息
const getPersonalInfoRoute = createRoute({
  method: 'get',
  path: '/{resumeId}',
  summary: 'Get Personal Info',
  description: 'Get personal information for a specific resume',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      resumeId: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PersonalInfoResponseSchema,
        },
      },
      description: 'Personal information',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Personal info not found',
    },
  },
})

personalInfo.openapi(getPersonalInfoRoute, async (c) => {
  try {
    const currentUser = await AuthService.getUserFromDatabase(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { resumeId } = c.req.valid('param')

    // 验证简历属于当前用户
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: currentUser.id,
      },
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const info = await prisma.personalInfo.findUnique({
      where: { resumeId },
    })

    if (!info) {
      return c.json({ error: 'Personal info not found' }, 404)
    }

    return c.json({
      id: info.id,
      resumeId: info.resumeId,
      fullName: info.fullName,
      email: info.email,
      phone: info.phone,
      address: info.address,
      city: info.city,
      country: info.country,
      website: info.website,
      linkedin: info.linkedin,
      github: info.github,
      summary: info.summary,
      objective: info.objective,
      createdAt: info.createdAt.toISOString(),
      updatedAt: info.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Get personal info error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 创建或更新个人信息
const upsertPersonalInfoRoute = createRoute({
  method: 'put',
  path: '/{resumeId}',
  summary: 'Update Personal Info',
  description: 'Create or update personal information for a specific resume',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      resumeId: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: PersonalInfoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PersonalInfoResponseSchema,
        },
      },
      description: 'Personal info updated successfully',
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

personalInfo.openapi(upsertPersonalInfoRoute, async (c) => {
  try {
    const currentUser = await AuthService.getUserFromDatabase(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { resumeId } = c.req.valid('param')
    const data = c.req.valid('json')

    // 验证简历属于当前用户
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: currentUser.id,
      },
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const info = await prisma.personalInfo.upsert({
      where: { resumeId },
      update: data,
      create: {
        resumeId,
        ...data,
      },
    })

    return c.json({
      id: info.id,
      resumeId: info.resumeId,
      fullName: info.fullName,
      email: info.email,
      phone: info.phone,
      address: info.address,
      city: info.city,
      country: info.country,
      website: info.website,
      linkedin: info.linkedin,
      github: info.github,
      summary: info.summary,
      objective: info.objective,
      createdAt: info.createdAt.toISOString(),
      updatedAt: info.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Upsert personal info error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 删除个人信息
const deletePersonalInfoRoute = createRoute({
  method: 'delete',
  path: '/{resumeId}',
  summary: 'Delete Personal Info',
  description: 'Delete personal information for a specific resume',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      resumeId: z.string(),
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
      description: 'Personal info deleted successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Personal info not found',
    },
  },
})

personalInfo.openapi(deletePersonalInfoRoute, async (c) => {
  try {
    const currentUser = await AuthService.getUserFromDatabase(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { resumeId } = c.req.valid('param')

    // 验证简历属于当前用户
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: currentUser.id,
      },
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    const deletedInfo = await prisma.personalInfo.delete({
      where: { resumeId },
    })

    if (!deletedInfo) {
      return c.json({ error: 'Personal info not found' }, 404)
    }

    return c.json({ message: 'Personal info deleted successfully' })
  } catch (error) {
    console.error('Delete personal info error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default personalInfo
