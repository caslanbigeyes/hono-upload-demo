import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { AuthService } from '../lib/auth'
import { WeChatService } from '../lib/wechat'
import { prisma } from '../lib/database'

const auth = new OpenAPIHono()

// Zod schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const WeChatCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
})

const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatar: z.string().nullable(),
  provider: z.string(),
  createdAt: z.string(),
}).openapi('User')

const AuthResponseSchema = z.object({
  user: UserResponseSchema,
  token: z.string(),
}).openapi('AuthResponse')

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

// 用户注册
const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  summary: 'User Registration',
  description: 'Register a new user with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'User registered successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Registration failed',
    },
  },
})

auth.openapi(registerRoute, async (c) => {
  try {
    const { email, password, name } = c.req.valid('json')

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400)
    }

    // 哈希密码
    const hashedPassword = await AuthService.hashPassword(password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'email',
      },
    })

    // 生成 JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
    })

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    }, 201)
  } catch (error) {
    console.error('Registration error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 用户登录
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  summary: 'User Login',
  description: 'Login with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'Login successful',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid credentials',
    },
  },
})

auth.openapi(loginRoute, async (c) => {
  try {
    const { email, password } = c.req.valid('json')

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // 验证密码
    const isValidPassword = await AuthService.verifyPassword(password, user.password)
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // 生成 JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
    })

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 微信登录回调
const wechatCallbackRoute = createRoute({
  method: 'post',
  path: '/wechat/callback',
  summary: 'WeChat Login Callback',
  description: 'Handle WeChat OAuth callback',
  request: {
    body: {
      content: {
        'application/json': {
          schema: WeChatCallbackSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthResponseSchema,
        },
      },
      description: 'WeChat login successful',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'WeChat login failed',
    },
  },
})

auth.openapi(wechatCallbackRoute, async (c) => {
  try {
    const { code } = c.req.valid('json')

    // 获取微信 access_token
    const tokenData = await WeChatService.getAccessToken(code)
    if (!tokenData) {
      return c.json({ error: 'Failed to get WeChat access token' }, 400)
    }

    // 获取微信用户信息
    const userInfo = await WeChatService.getUserInfo(tokenData.access_token, tokenData.openid)
    if (!userInfo) {
      return c.json({ error: 'Failed to get WeChat user info' }, 400)
    }

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { wechatId: userInfo.openid },
    })

    if (!user) {
      // 创建新用户
      user = await prisma.user.create({
        data: {
          wechatId: userInfo.openid,
          unionId: userInfo.unionid,
          name: userInfo.nickname,
          avatar: userInfo.headimgurl,
          provider: 'wechat',
          email: `wechat_${userInfo.openid}@temp.com`, // 临时邮箱，后续可以让用户绑定
        },
      })
    } else {
      // 更新用户信息
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userInfo.nickname,
          avatar: userInfo.headimgurl,
          unionId: userInfo.unionid,
        },
      })
    }

    // 生成 JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
    })

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    })
  } catch (error) {
    console.error('WeChat login error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 获取微信授权 URL
const wechatAuthUrlRoute = createRoute({
  method: 'get',
  path: '/wechat/auth-url',
  summary: 'Get WeChat Auth URL',
  description: 'Get WeChat OAuth authorization URL',
  request: {
    query: z.object({
      redirect_uri: z.string(),
      state: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            authUrl: z.string(),
          }),
        },
      },
      description: 'WeChat auth URL generated',
    },
  },
})

auth.openapi(wechatAuthUrlRoute, async (c) => {
  const { redirect_uri, state } = c.req.valid('query')
  const authUrl = WeChatService.getAuthUrl(redirect_uri, state)

  return c.json({ authUrl })
})

export default auth
