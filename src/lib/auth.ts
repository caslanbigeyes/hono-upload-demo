import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { Context } from 'hono'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export class AuthService {
  // 生成 JWT Token
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  }

  // 验证 JWT Token
  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload
    } catch (error) {
      return null
    }
  }

  // 哈希密码
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  // 验证密码
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  // 从请求头中提取 token
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.substring(7)
  }

  // 从 Context 中获取当前用户
  static getCurrentUser(c: Context): JWTPayload | null {
    return c.get('user') || null
  }
}

// JWT 中间件
export const jwtMiddleware = async (c: Context, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization')
  const token = AuthService.extractTokenFromHeader(authHeader)

  if (!token) {
    return c.json({ error: 'Authorization token required' }, 401)
  }

  const payload = AuthService.verifyToken(token)
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // 将用户信息存储到 context 中
  c.set('user', payload)
  await next()
}

// 可选的 JWT 中间件（不强制要求登录）
export const optionalJwtMiddleware = async (c: Context, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization')
  const token = AuthService.extractTokenFromHeader(authHeader)

  if (token) {
    const payload = AuthService.verifyToken(token)
    if (payload) {
      c.set('user', payload)
    }
  }

  await next()
}
