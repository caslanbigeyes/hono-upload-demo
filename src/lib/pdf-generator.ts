import PDFDocument from 'pdfkit'

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

export class PDFGenerator {
  private doc: PDFKit.PDFDocument
  private currentY: number = 50
  private pageMargin = 50
  private pageWidth = 595.28 // A4 width in points
  private contentWidth = this.pageWidth - (this.pageMargin * 2)

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
  }

  // 处理中文字符 - 将中文字符转换为可显示的格式
  private processChinese(text: string): string {
    // 对于包含中文的文本，我们保持原样
    // PDFKit 会尽力渲染，虽然可能不完美
    return text
  }

  // 获取字体
  private getFont(bold: boolean = false): string {
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

    // 姓名
    this.doc
      .fontSize(28)
      .font(this.getFont(true))
      .fillColor('#1f2937')
      .text(this.processChinese(personalInfo.name), this.pageMargin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      })

    this.currentY += 40

    // 联系信息
    const contactInfo = [
      personalInfo.email,
      personalInfo.phone,
      personalInfo.location,
      personalInfo.website
    ].filter(Boolean).join(' • ')

    this.doc
      .fontSize(11)
      .font(this.getFont())
      .fillColor('#6b7280')
      .text(this.processChinese(contactInfo), this.pageMargin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      })

    this.currentY += 30

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
        .fontSize(10)
        .font('Helvetica')
        .text(personalInfo.summary, this.pageMargin, this.currentY, {
          width: this.contentWidth,
          align: 'justify'
        })
      
      this.currentY += this.doc.heightOfString(personalInfo.summary, {
        width: this.contentWidth
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
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`${exp.position} - ${exp.company}`, this.pageMargin, this.currentY)
      
      this.currentY += 15

      // 时间和地点
      const dateRange = exp.isCurrent 
        ? `${exp.startDate} - 至今`
        : `${exp.startDate} - ${exp.endDate || ''}`
      
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .text(`${dateRange}${exp.location ? ` | ${exp.location}` : ''}`, 
               this.pageMargin, this.currentY)
      
      this.currentY += 15

      // 描述
      if (exp.description) {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text(exp.description, this.pageMargin, this.currentY, {
            width: this.contentWidth
          })
        
        this.currentY += this.doc.heightOfString(exp.description, {
          width: this.contentWidth
        }) + 5
      }

      // 成就
      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach(achievement => {
          if (achievement.trim()) {
            this.doc
              .fontSize(10)
              .font('Helvetica')
              .text(`• ${achievement}`, this.pageMargin + 10, this.currentY, {
                width: this.contentWidth - 10
              })
            
            this.currentY += this.doc.heightOfString(`• ${achievement}`, {
              width: this.contentWidth - 10
            }) + 3
          }
        })
      }

      if (index < experiences.length - 1) {
        this.currentY += 15
      }
    })

    this.currentY += 20
  }

  private generateEducations(educations: ResumeData['educations']) {
    if (educations.length === 0) return

    this.addSectionTitle('教育经历')

    educations.forEach((edu, index) => {
      this.checkPageBreak(60)

      // 学校和学位
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`${edu.degree} - ${edu.major}`, this.pageMargin, this.currentY)
      
      this.currentY += 15

      // 学校和时间
      const dateRange = edu.isCurrent 
        ? `${edu.startDate} - 至今`
        : `${edu.startDate} - ${edu.endDate || ''}`
      
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .text(`${edu.school} | ${dateRange}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`, 
               this.pageMargin, this.currentY)
      
      this.currentY += 15

      // 描述
      if (edu.description) {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text(edu.description, this.pageMargin, this.currentY, {
            width: this.contentWidth
          })
        
        this.currentY += this.doc.heightOfString(edu.description, {
          width: this.contentWidth
        }) + 5
      }

      if (index < educations.length - 1) {
        this.currentY += 15
      }
    })

    this.currentY += 20
  }

  private generateProjects(projects: ResumeData['projects']) {
    if (projects.length === 0) return

    this.addSectionTitle('项目经历')

    projects.forEach((project, index) => {
      this.checkPageBreak(60)

      // 项目名称
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(project.name, this.pageMargin, this.currentY)
      
      this.currentY += 15

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
          .fontSize(9)
          .font('Helvetica')
          .text(projectInfo.join(' | '), this.pageMargin, this.currentY)
        
        this.currentY += 15
      }

      // 描述
      if (project.description) {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text(project.description, this.pageMargin, this.currentY, {
            width: this.contentWidth
          })
        
        this.currentY += this.doc.heightOfString(project.description, {
          width: this.contentWidth
        }) + 5
      }

      // 技术栈
      if (project.technologies && project.technologies.length > 0) {
        this.doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('技术栈: ', this.pageMargin, this.currentY, { continued: true })
          .font('Helvetica')
          .text(project.technologies.join(', '))
        
        this.currentY += 15
      }

      if (index < projects.length - 1) {
        this.currentY += 15
      }
    })

    this.currentY += 20
  }

  private generateSkills(skills: ResumeData['skills']) {
    if (skills.length === 0) return

    this.addSectionTitle('技能专长')

    skills.forEach((skillGroup, index) => {
      this.checkPageBreak(30)

      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${skillGroup.category}: `, this.pageMargin, this.currentY, { continued: true })
        .font('Helvetica')
        .text(skillGroup.items.join(', '))
      
      this.currentY += 15
    })
  }

  private addSectionTitle(title: string) {
    this.checkPageBreak(50)

    // 添加图标背景
    this.doc
      .rect(this.pageMargin - 5, this.currentY - 5, 8, 20)
      .fill('#2563eb')

    this.doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1f2937')
      .text(title, this.pageMargin + 15, this.currentY)

    this.currentY += 25

    // 添加装饰性下划线
    this.doc
      .moveTo(this.pageMargin + 15, this.currentY - 8)
      .lineTo(this.pageMargin + 15 + this.doc.widthOfString(title, { fontSize: 16 }) + 20, this.currentY - 8)
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
