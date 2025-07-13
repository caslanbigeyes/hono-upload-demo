import { Hono } from 'hono'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { AuthService } from '../lib/auth'
import { prisma } from '../lib/database'
import { PDFGenerator, type ResumeData } from '../lib/pdf-generator'
import { FixedPDFGenerator } from '../lib/pdf-generator-fixed'
import { TemplateManager } from '../lib/pdf-templates'

const pdfExport = new Hono()

// 初始化模板管理器
const templateManager = new TemplateManager()

// 测试路由 - 不需要认证
pdfExport.get('/test', (c) => {
  return c.json({ message: 'PDF export routes are working!' })
})

// Zod schemas
const ExportPDFParamsSchema = z.object({
  resumeId: z.string().min(1, 'Resume ID is required'),
})

const ExportPDFQuerySchema = z.object({
  template: z.string().optional().default('classic'),
})

const ErrorResponseSchema = z.object({
  error: z.string(),
}).openapi('ErrorResponse')

const TemplateSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
}).openapi('Template')

const TemplateListResponseSchema = z.object({
  templates: z.array(TemplateSchema),
}).openapi('TemplateListResponse')

// 获取可用模板列表
pdfExport.get('/templates', async (c) => {
  try {
    const templates = templateManager.getAllTemplates().map(template => ({
      name: template.name,
      displayName: template.displayName,
      description: template.description,
    }))

    return c.json({ templates })
  } catch (error) {
    console.error('Get templates error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST方式导出PDF - 支持前端的请求格式
pdfExport.post('/', async (c) => {
  try {
    // 手动JWT认证
    const authHeader = c.req.header('Authorization')
    const token = AuthService.extractTokenFromHeader(authHeader)

    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401)
    }

    const currentUser = AuthService.verifyToken(token)
    if (!currentUser) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    const body = await c.req.json()
    const { resumeId, template = 'classic', language: rawLanguage = 'auto' } = body

    if (!resumeId) {
      return c.json({ error: 'Resume ID is required' }, 400)
    }

    // 智能处理语言参数，兼容更多格式
    let language = 'auto'
    if (rawLanguage) {
      const lang = rawLanguage.toLowerCase()
      if (lang === 'english' || lang === 'en' || lang === 'en-us') {
        language = 'english'
      } else if (lang === 'chinese' || lang === 'zh' || lang === 'zh-cn' || lang === 'zh-tw') {
        language = 'chinese'
      } else if (lang === 'auto') {
        language = 'auto'
      } else {
        // 不支持的语言，使用auto模式并记录警告
        console.log(`⚠️  Unsupported language "${rawLanguage}", using auto mode`)
        language = 'auto'
      }
    }

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: currentUser.userId
      },
      include: {
        personalInfo: true,
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startDate: 'desc' }
        },
        projects: {
          orderBy: { createdAt: 'desc' }
        },
        skills: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    // 构建简历数据
    const resumeData: ResumeData = {
      personalInfo: {
        name: resume.personalInfo?.fullName || '未填写姓名',
        email: resume.personalInfo?.email || '',
        phone: resume.personalInfo?.phone || undefined,
        location: resume.personalInfo?.address || undefined,
        website: resume.personalInfo?.website || undefined,
        summary: resume.personalInfo?.summary || undefined,
      },
      experiences: resume.experiences.map(exp => ({
        company: exp.company,
        position: exp.position,
        location: exp.location || undefined,
        startDate: exp.startDate ? exp.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: exp.endDate?.toISOString().split('T')[0] || undefined,
        isCurrent: exp.isCurrent,
        description: exp.description || undefined,
        achievements: exp.achievements ? JSON.parse(exp.achievements) : undefined,
      })),
      educations: resume.educations.map(edu => ({
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate ? edu.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: edu.endDate?.toISOString().split('T')[0] || undefined,
        isCurrent: edu.isCurrent,
        gpa: edu.gpa || undefined,
        description: edu.description || undefined,
      })),
      projects: resume.projects.map(project => ({
        name: project.name,
        description: project.description || undefined,
        technologies: project.technologies ? JSON.parse(project.technologies) : undefined,
        url: project.url || undefined,
        startDate: project.startDate?.toISOString().split('T')[0] || undefined,
        endDate: project.endDate?.toISOString().split('T')[0] || undefined,
      })),
      skills: resume.skills.reduce((acc, skill) => {
        const existingCategory = acc.find(s => s.category === skill.category)
        if (existingCategory) {
          existingCategory.items.push(skill.name)
        } else {
          acc.push({
            category: skill.category,
            items: [skill.name]
          })
        }
        return acc
      }, [] as Array<{ category: string; items: string[] }>),
    }

    // 生成PDF - 使用修复的PDF生成器，支持语言选项
    let pdfBuffer: Buffer
    if (template && template !== 'classic') {
      // 使用模板管理器生成PDF
      pdfBuffer = await templateManager.generatePDF(template, resumeData)
    } else {
      // 使用修复的PDF生成器，支持语言选项
      const pdfGenerator = new FixedPDFGenerator({
        language: language as 'auto' | 'chinese' | 'english'
      })
      pdfBuffer = await pdfGenerator.generateResumePDF(resumeData)
    }

    // 设置响应头
    const fileName = `${resume.personalInfo?.fullName || 'resume'}_${new Date().toISOString().split('T')[0]}.pdf`

    c.header('Content-Type', 'application/pdf')
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    c.header('Content-Length', pdfBuffer.length.toString())

    return c.body(pdfBuffer)

  } catch (error) {
    console.error('Export PDF error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET方式导出PDF - 保持兼容性
pdfExport.get('/:resumeId', async (c) => {
  try {
    // 手动JWT认证
    const authHeader = c.req.header('Authorization')
    const token = AuthService.extractTokenFromHeader(authHeader)
    
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401)
    }

    const currentUser = AuthService.verifyToken(token)
    if (!currentUser) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    const resumeId = c.req.param('resumeId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { 
        id: resumeId, 
        userId: currentUser.userId 
      },
      include: {
        personalInfo: true,
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startDate: 'desc' }
        },
        projects: {
          orderBy: { createdAt: 'desc' }
        },
        skills: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    // 构建简历数据
    const resumeData: ResumeData = {
      personalInfo: {
        name: resume.personalInfo?.fullName || '未填写姓名',
        email: resume.personalInfo?.email || '',
        phone: resume.personalInfo?.phone || undefined,
        location: resume.personalInfo?.address || undefined,
        website: resume.personalInfo?.website || undefined,
        summary: resume.personalInfo?.summary || undefined,
      },
      experiences: resume.experiences.map(exp => ({
        company: exp.company,
        position: exp.position,
        location: exp.location || undefined,
        startDate: exp.startDate ? exp.startDate.toISOString().split('T')[0] : '',
        endDate: exp.endDate?.toISOString().split('T')[0] || undefined,
        isCurrent: exp.isCurrent,
        description: exp.description || undefined,
        achievements: exp.achievements ? JSON.parse(exp.achievements) : undefined,
      })),
      educations: resume.educations.map(edu => ({
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate ? edu.startDate.toISOString().split('T')[0] : '',
        endDate: edu.endDate?.toISOString().split('T')[0] || undefined,
        isCurrent: edu.isCurrent,
        gpa: edu.gpa || undefined,
        description: edu.description || undefined,
      })),
      projects: resume.projects.map(project => ({
        name: project.name,
        description: project.description || undefined,
        technologies: project.technologies ? JSON.parse(project.technologies) : undefined,
        url: project.url || undefined,
        startDate: project.startDate?.toISOString().split('T')[0] || undefined,
        endDate: project.endDate?.toISOString().split('T')[0] || undefined,
      })),
      skills: resume.skills.reduce((acc, skill) => {
        const existingCategory = acc.find(s => s.category === skill.category)
        if (existingCategory) {
          existingCategory.items.push(skill.name)
        } else {
          acc.push({
            category: skill.category,
            items: [skill.name]
          })
        }
        return acc
      }, [] as Array<{ category: string; items: string[] }>),
    }

    // 生成PDF
    const pdfGenerator = new PDFGenerator()
    const pdfBuffer = await pdfGenerator.generateResumePDF(resumeData)

    // 设置响应头
    const fileName = `${resume.personalInfo?.fullName || 'resume'}_${new Date().toISOString().split('T')[0]}.pdf`
    
    c.header('Content-Type', 'application/pdf')
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
    c.header('Content-Length', pdfBuffer.length.toString())

    return c.body(pdfBuffer)

  } catch (error) {
    console.error('Export PDF error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 预览简历PDF
pdfExport.get('/:resumeId/preview', async (c) => {
  try {
    // 手动JWT认证
    const authHeader = c.req.header('Authorization')
    const token = AuthService.extractTokenFromHeader(authHeader)
    
    if (!token) {
      return c.json({ error: 'Authorization token required' }, 401)
    }

    const currentUser = AuthService.verifyToken(token)
    if (!currentUser) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    const resumeId = c.req.param('resumeId')

    // 验证简历是否属于当前用户
    const resume = await prisma.resume.findFirst({
      where: { 
        id: resumeId, 
        userId: currentUser.userId 
      },
      include: {
        personalInfo: true,
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startDate: 'desc' }
        },
        projects: {
          orderBy: { createdAt: 'desc' }
        },
        skills: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!resume) {
      return c.json({ error: 'Resume not found' }, 404)
    }

    // 构建简历数据（与导出相同的逻辑）
    const resumeData: ResumeData = {
      personalInfo: {
        name: resume.personalInfo?.fullName || '未填写姓名',
        email: resume.personalInfo?.email || '',
        phone: resume.personalInfo?.phone || undefined,
        location: resume.personalInfo?.address || undefined,
        website: resume.personalInfo?.website || undefined,
        summary: resume.personalInfo?.summary || undefined,
      },
      experiences: resume.experiences.map(exp => ({
        company: exp.company,
        position: exp.position,
        location: exp.location || undefined,
        startDate: exp.startDate ? exp.startDate.toISOString().split('T')[0] : '',
        endDate: exp.endDate?.toISOString().split('T')[0] || undefined,
        isCurrent: exp.isCurrent,
        description: exp.description || undefined,
        achievements: exp.achievements ? JSON.parse(exp.achievements) : undefined,
      })),
      educations: resume.educations.map(edu => ({
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate ? edu.startDate.toISOString().split('T')[0] : '',
        endDate: edu.endDate?.toISOString().split('T')[0] || undefined,
        isCurrent: edu.isCurrent,
        gpa: edu.gpa || undefined,
        description: edu.description || undefined,
      })),
      projects: resume.projects.map(project => ({
        name: project.name,
        description: project.description || undefined,
        technologies: project.technologies ? JSON.parse(project.technologies) : undefined,
        url: project.url || undefined,
        startDate: project.startDate?.toISOString().split('T')[0] || undefined,
        endDate: project.endDate?.toISOString().split('T')[0] || undefined,
      })),
      skills: resume.skills.reduce((acc, skill) => {
        const existingCategory = acc.find(s => s.category === skill.category)
        if (existingCategory) {
          existingCategory.items.push(skill.name)
        } else {
          acc.push({
            category: skill.category,
            items: [skill.name]
          })
        }
        return acc
      }, [] as Array<{ category: string; items: string[] }>),
    }

    // 生成PDF
    const pdfGenerator = new PDFGenerator()
    const pdfBuffer = await pdfGenerator.generateResumePDF(resumeData)

    // 设置响应头为内联显示
    c.header('Content-Type', 'application/pdf')
    c.header('Content-Disposition', 'inline')
    c.header('Content-Length', pdfBuffer.length.toString())

    return c.body(pdfBuffer)

  } catch (error) {
    console.error('Preview PDF error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default pdfExport
