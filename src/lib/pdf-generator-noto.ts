import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

export interface ResumeData {
  personalInfo: {
    name: string
    email: string
    phone?: string
    location?: string
    website?: string
    summary?: string
  }
  experiences: Array<{
    company: string
    position: string
    location?: string
    startDate: string
    endDate?: string
    isCurrent: boolean
    description?: string
    achievements?: string[]
  }>
  educations: Array<{
    school: string
    degree: string
    major: string
    startDate: string
    endDate?: string
    isCurrent: boolean
    gpa?: string
    description?: string
  }>
  projects: Array<{
    name: string
    description?: string
    technologies?: string[]
    url?: string
    startDate?: string
    endDate?: string
  }>
  skills: Array<{
    category: string
    items: string[]
  }>
}

export class NotoPDFGenerator {
  private doc: PDFKit.PDFDocument
  private currentY: number = 50
  private pageMargin = 50
  private pageWidth = 595.28 // A4 width in points
  private contentWidth = this.pageWidth - (this.pageMargin * 2)
  private chineseFontRegistered = false

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.pageMargin,
      info: {
        Title: 'Resume',
        Author: 'Resume Builder',
        Subject: 'Professional Resume'
      }
    })
    
    this.setupNotoFont()
  }

  private setupNotoFont() {
    try {
      // 尝试使用 Noto Sans SC 字体
      const fontPaths = [
        'node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff2',
        'node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff',
        'node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff2',
        'node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff',
      ]

      // 检查字体文件是否存在
      for (const fontPath of fontPaths) {
        if (fs.existsSync(fontPath)) {
          console.log(`Found Noto font: ${fontPath}`)
        }
      }

      console.log('Using fallback fonts for Chinese text')
    } catch (error) {
      console.log('Error setting up Noto font:', error)
    }
  }

  private getFont(bold: boolean = false): string {
    // 使用标准字体，PDFKit会尽力渲染中文
    return bold ? 'Helvetica-Bold' : 'Helvetica'
  }

  async generateResumePDF(resumeData: ResumeData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      
      this.doc.on('data', (chunk) => chunks.push(chunk))
      this.doc.on('end', () => resolve(Buffer.concat(chunks)))
      this.doc.on('error', reject)

      try {
        this.generateHeader(resumeData.personalInfo)
        this.generatePersonalInfo(resumeData.personalInfo)
        this.generateExperiences(resumeData.experiences)
        this.generateEducations(resumeData.educations)
        this.generateProjects(resumeData.projects)
        this.generateSkills(resumeData.skills)
        
        this.doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  private generateHeader(personalInfo: ResumeData['personalInfo']) {
    // 添加顶部装饰条
    this.doc
      .rect(0, 0, this.pageWidth, 8)
      .fill('#2563eb')
    
    this.currentY = 30

    // 姓名 - 使用更大的字体以便中文显示
    this.doc
      .fontSize(32)
      .font(this.getFont(true))
      .fillColor('#1f2937')
      .text(personalInfo.name, this.pageMargin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      })
    
    this.currentY += 45

    // 联系信息
    const contactInfo = [
      personalInfo.email,
      personalInfo.phone,
      personalInfo.location,
      personalInfo.website
    ].filter(Boolean).join(' • ')

    this.doc
      .fontSize(12)
      .font(this.getFont())
      .fillColor('#6b7280')
      .text(contactInfo, this.pageMargin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      })
    
    this.currentY += 35

    // 装饰性分割线
    this.doc
      .moveTo(this.pageMargin + 100, this.currentY)
      .lineTo(this.pageWidth - this.pageMargin - 100, this.currentY)
      .lineWidth(2)
      .strokeColor('#e5e7eb')
      .stroke()
    
    this.currentY += 25
  }

  private generatePersonalInfo(personalInfo: ResumeData['personalInfo']) {
    if (personalInfo.summary) {
      this.addSectionTitle('个人简介')
      this.doc
        .fontSize(11)
        .font(this.getFont())
        .fillColor('#374151')
        .text(personalInfo.summary, this.pageMargin, this.currentY, {
          width: this.contentWidth,
          align: 'justify',
          lineGap: 2
        })
      
      this.currentY += this.doc.heightOfString(personalInfo.summary, {
        width: this.contentWidth,
        lineGap: 2
      }) + 20
    }
  }

  private generateExperiences(experiences: ResumeData['experiences']) {
    if (experiences.length === 0) return

    this.addSectionTitle('工作经历')

    experiences.forEach((exp, index) => {
      this.checkPageBreak(80)

      // 公司和职位
      this.doc
        .fontSize(13)
        .font(this.getFont(true))
        .fillColor('#1f2937')
        .text(`${exp.position} - ${exp.company}`, this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 时间和地点
      const dateRange = exp.isCurrent 
        ? `${exp.startDate} - 至今`
        : `${exp.startDate} - ${exp.endDate || ''}`
      
      this.doc
        .fontSize(10)
        .font(this.getFont())
        .fillColor('#6b7280')
        .text(`${dateRange}${exp.location ? ` | ${exp.location}` : ''}`, 
               this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 描述
      if (exp.description) {
        this.doc
          .fontSize(11)
          .font(this.getFont())
          .fillColor('#374151')
          .text(exp.description, this.pageMargin, this.currentY, {
            width: this.contentWidth,
            lineGap: 1
          })
        
        this.currentY += this.doc.heightOfString(exp.description, {
          width: this.contentWidth,
          lineGap: 1
        }) + 8
      }

      // 成就
      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach(achievement => {
          if (achievement.trim()) {
            this.doc
              .fontSize(11)
              .font(this.getFont())
              .fillColor('#374151')
              .text(`• ${achievement}`, this.pageMargin + 15, this.currentY, {
                width: this.contentWidth - 15,
                lineGap: 1
              })
            
            this.currentY += this.doc.heightOfString(`• ${achievement}`, {
              width: this.contentWidth - 15,
              lineGap: 1
            }) + 5
          }
        })
      }

      if (index < experiences.length - 1) {
        this.currentY += 20
      }
    })

    this.currentY += 25
  }

  private generateEducations(educations: ResumeData['educations']) {
    if (educations.length === 0) return

    this.addSectionTitle('教育经历')

    educations.forEach((edu, index) => {
      this.checkPageBreak(60)

      // 学校和学位
      this.doc
        .fontSize(13)
        .font(this.getFont(true))
        .fillColor('#1f2937')
        .text(`${edu.degree} - ${edu.major}`, this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 学校和时间
      const dateRange = edu.isCurrent 
        ? `${edu.startDate} - 至今`
        : `${edu.startDate} - ${edu.endDate || ''}`
      
      this.doc
        .fontSize(10)
        .font(this.getFont())
        .fillColor('#6b7280')
        .text(`${edu.school} | ${dateRange}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`, 
               this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 描述
      if (edu.description) {
        this.doc
          .fontSize(11)
          .font(this.getFont())
          .fillColor('#374151')
          .text(edu.description, this.pageMargin, this.currentY, {
            width: this.contentWidth,
            lineGap: 1
          })
        
        this.currentY += this.doc.heightOfString(edu.description, {
          width: this.contentWidth,
          lineGap: 1
        }) + 8
      }

      if (index < educations.length - 1) {
        this.currentY += 18
      }
    })

    this.currentY += 25
  }

  private generateProjects(projects: ResumeData['projects']) {
    if (projects.length === 0) return

    this.addSectionTitle('项目经历')

    projects.forEach((project, index) => {
      this.checkPageBreak(60)

      // 项目名称
      this.doc
        .fontSize(13)
        .font(this.getFont(true))
        .fillColor('#1f2937')
        .text(project.name, this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 时间和链接
      const projectInfo = []
      if (project.startDate) {
        const dateRange = project.endDate 
          ? `${project.startDate} - ${project.endDate}`
          : project.startDate
        projectInfo.push(dateRange)
      }
      if (project.url) {
        projectInfo.push(project.url)
      }

      if (projectInfo.length > 0) {
        this.doc
          .fontSize(10)
          .font(this.getFont())
          .fillColor('#6b7280')
          .text(projectInfo.join(' | '), this.pageMargin, this.currentY)
        
        this.currentY += 18
      }

      // 描述
      if (project.description) {
        this.doc
          .fontSize(11)
          .font(this.getFont())
          .fillColor('#374151')
          .text(project.description, this.pageMargin, this.currentY, {
            width: this.contentWidth,
            lineGap: 1
          })
        
        this.currentY += this.doc.heightOfString(project.description, {
          width: this.contentWidth,
          lineGap: 1
        }) + 8
      }

      // 技术栈
      if (project.technologies && project.technologies.length > 0) {
        this.doc
          .fontSize(11)
          .font(this.getFont(true))
          .fillColor('#374151')
          .text('技术栈: ', this.pageMargin, this.currentY, { continued: true })
          .font(this.getFont())
          .text(project.technologies.join(', '))
        
        this.currentY += 18
      }

      if (index < projects.length - 1) {
        this.currentY += 18
      }
    })

    this.currentY += 25
  }

  private generateSkills(skills: ResumeData['skills']) {
    if (skills.length === 0) return

    this.addSectionTitle('技能专长')

    skills.forEach((skillGroup, index) => {
      this.checkPageBreak(30)

      this.doc
        .fontSize(11)
        .font(this.getFont(true))
        .fillColor('#374151')
        .text(`${skillGroup.category}: `, this.pageMargin, this.currentY, { continued: true })
        .font(this.getFont())
        .text(skillGroup.items.join(', '))
      
      this.currentY += 18
    })
  }

  private addSectionTitle(title: string) {
    this.checkPageBreak(50)
    
    // 添加图标背景
    this.doc
      .rect(this.pageMargin - 5, this.currentY - 5, 8, 22)
      .fill('#2563eb')
    
    this.doc
      .fontSize(16)
      .font(this.getFont(true))
      .fillColor('#1f2937')
      .text(title, this.pageMargin + 15, this.currentY)
    
    this.currentY += 28

    // 添加装饰性下划线
    this.doc
      .moveTo(this.pageMargin + 15, this.currentY - 10)
      .lineTo(this.pageMargin + 15 + this.doc.widthOfString(title, { fontSize: 16 }) + 20, this.currentY - 10)
      .lineWidth(1)
      .strokeColor('#e5e7eb')
      .stroke()
    
    this.currentY += 15
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > 750) { // A4 height minus margin
      this.doc.addPage()
      this.currentY = this.pageMargin
    }
  }
}
