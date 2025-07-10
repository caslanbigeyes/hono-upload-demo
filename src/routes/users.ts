import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { jwtMiddleware, AuthService } from '../lib/auth'
import { prisma } from '../lib/database'

const users = new OpenAPIHono()

// Zod schemas
const UpdateUserSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
})

const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatar: z.string().nullable(),
  phone: z.string().nullable(),
  provider: z.string(),
  isVerified: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).openapi('UserProfile')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 获取当前用户信息
const getCurrentUserRoute = createRoute({
  method: 'get',
  path: '/me',
  summary: 'Get Current User',
  description: 'Get current authenticated user information',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
      description: 'Current user information',
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

users.openapi(getCurrentUserRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    })

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      provider: user.provider,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 更新用户信息
const updateUserRoute = createRoute({
  method: 'put',
  path: '/me',
  summary: 'Update User Profile',
  description: 'Update current user profile information',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
      description: 'User updated successfully',
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

users.openapi(updateUserRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const updateData = c.req.valid('json')

    const user = await prisma.user.update({
      where: { id: currentUser.userId },
      data: updateData,
    })

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      provider: user.provider,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Update user error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 修改密码
const changePasswordRoute = createRoute({
  method: 'post',
  path: '/change-password',
  summary: 'Change Password',
  description: 'Change user password',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChangePasswordSchema,
        },
      },
    },
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
      description: 'Password changed successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid current password',
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

users.openapi(changePasswordRoute, jwtMiddleware, async (c) => {
  try {
    const currentUser = AuthService.getCurrentUser(c)
    if (!currentUser) {
      return c.json({ error: 'User not found' }, 401)
    }

    const { currentPassword, newPassword } = c.req.valid('json')

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    })

    if (!user || !user.password) {
      return c.json({ error: 'User not found or password not set' }, 400)
    }

    // 验证当前密码
    const isValidPassword = await AuthService.verifyPassword(currentPassword, user.password)
    if (!isValidPassword) {
      return c.json({ error: 'Invalid current password' }, 400)
    }

    // 哈希新密码
    const hashedNewPassword = await AuthService.hashPassword(newPassword)

    // 更新密码
    await prisma.user.update({
      where: { id: currentUser.userId },
      data: { password: hashedNewPassword },
    })

    return c.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default users
