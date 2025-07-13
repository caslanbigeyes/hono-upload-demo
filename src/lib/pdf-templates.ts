import PDFDocument from 'pdfkit'
import { type ResumeData } from './pdf-generator'

export interface PDFTemplate {
  name: string
  displayName: string
  description: string
  generate(resumeData: ResumeData): Promise<Buffer>
}

// 经典模板
export class ClassicTemplate implements PDFTemplate {
  name = 'classic'
  displayName = '经典模板'
  description = '简洁专业的经典简历模板'

  private doc: PDFKit.PDFDocument
  private currentY: number = 50
  private pageMargin = 50
  private pageWidth = 595.28
  private contentWidth = this.pageWidth - (this.pageMargin * 2)

  async generate(resumeData: ResumeData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.doc = new PDFDocument({
        size: 'A4',
        margin: this.pageMargin,
        info: {
          Title: `${resumeData.personalInfo.name} - Resume`,
          Author: resumeData.personalInfo.name,
          Subject: 'Professional Resume'
        }
      })

      const chunks: Buffer[] = []
      
      this.doc.on('data', (chunk) => chunks.push(chunk))
      this.doc.on('end', () => resolve(Buffer.concat(chunks)))
      this.doc.on('error', reject)

      try {
        this.generateClassicLayout(resumeData)
        this.doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  private generateClassicLayout(resumeData: ResumeData) {
    // 简洁的头部
    this.doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(resumeData.personalInfo.name, this.pageMargin, this.currentY)
    
    this.currentY += 30

    // 联系信息
    const contactInfo = [
      resumeData.personalInfo.email,
      resumeData.personalInfo.phone,
      resumeData.personalInfo.location
    ].filter(Boolean).join(' | ')

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .text(contactInfo, this.pageMargin, this.currentY)
    
    this.currentY += 25

    // 分割线
    this.doc
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(this.pageWidth - this.pageMargin, this.currentY)
      .stroke()
    
    this.currentY += 20

    // 各个部分
    if (resumeData.personalInfo.summary) {
      this.addSection('SUMMARY', resumeData.personalInfo.summary)
    }

    if (resumeData.experiences.length > 0) {
      this.addExperienceSection(resumeData.experiences)
    }

    if (resumeData.educations.length > 0) {
      this.addEducationSection(resumeData.educations)
    }

    if (resumeData.skills.length > 0) {
      this.addSkillsSection(resumeData.skills)
    }
  }

  private addSection(title: string, content: string) {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title, this.pageMargin, this.currentY)
    
    this.currentY += 15

    this.doc
      .fontSize(10)
      .font('Helvetica')
      .text(content, this.pageMargin, this.currentY, {
        width: this.contentWidth,
        align: 'justify'
      })
    
    this.currentY += this.doc.heightOfString(content, {
      width: this.contentWidth
    }) + 20
  }

  private addExperienceSection(experiences: ResumeData['experiences']) {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('EXPERIENCE', this.pageMargin, this.currentY)
    
    this.currentY += 20

    experiences.forEach((exp) => {
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${exp.position} - ${exp.company}`, this.pageMargin, this.currentY)
      
      this.currentY += 12

      const dateRange = exp.isCurrent 
        ? `${exp.startDate} - Present`
        : `${exp.startDate} - ${exp.endDate || ''}`
      
      this.doc
        .fontSize(9)
        .font('Helvetica')
        .text(dateRange, this.pageMargin, this.currentY)
      
      this.currentY += 15

      if (exp.description) {
        this.doc
          .fontSize(10)
          .font('Helvetica')
          .text(exp.description, this.pageMargin, this.currentY, {
            width: this.contentWidth
          })
        
        this.currentY += this.doc.heightOfString(exp.description, {
          width: this.contentWidth
        }) + 10
      }
    })

    this.currentY += 10
  }

  private addEducationSection(educations: ResumeData['educations']) {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('EDUCATION', this.pageMargin, this.currentY)
    
    this.currentY += 20

    educations.forEach((edu) => {
      this.doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${edu.degree} in ${edu.major}`, this.pageMargin, this.currentY)
      
      this.currentY += 12

      this.doc
        .fontSize(10)
        .font('Helvetica')
        .text(`${edu.school} | ${edu.startDate} - ${edu.endDate || 'Present'}`, this.pageMargin, this.currentY)
      
      this.currentY += 15
    })

    this.currentY += 10
  }

  private addSkillsSection(skills: ResumeData['skills']) {
    this.doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SKILLS', this.pageMargin, this.currentY)
    
    this.currentY += 20

    skills.forEach((skillGroup) => {
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${skillGroup.category}: `, this.pageMargin, this.currentY, { continued: true })
        .font('Helvetica')
        .text(skillGroup.items.join(', '))
      
      this.currentY += 15
    })
  }
}

// 现代模板
export class ModernTemplate implements PDFTemplate {
  name = 'modern'
  displayName = '现代模板'
  description = '时尚现代的简历模板，使用双栏布局'

  async generate(resumeData: ResumeData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        info: {
          Title: `${resumeData.personalInfo.name} - Modern Resume`,
          Author: resumeData.personalInfo.name,
          Subject: 'Modern Professional Resume'
        }
      })

      const chunks: Buffer[] = []
      
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      try {
        // 左侧栏背景
        doc
          .rect(0, 0, 200, 842)
          .fill('#f8fafc')

        // 右侧主要内容
        let currentY = 50

        // 姓名
        doc
          .fontSize(26)
          .font('Helvetica-Bold')
          .fillColor('#1e293b')
          .text(resumeData.personalInfo.name, 220, currentY)

        currentY += 40

        // 联系信息在左侧
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#475569')
          .text('CONTACT', 30, 50)

        let leftY = 70
        if (resumeData.personalInfo.email) {
          doc.fontSize(9).font('Helvetica').text(resumeData.personalInfo.email, 30, leftY)
          leftY += 15
        }
        if (resumeData.personalInfo.phone) {
          doc.text(resumeData.personalInfo.phone, 30, leftY)
          leftY += 15
        }
        if (resumeData.personalInfo.location) {
          doc.text(resumeData.personalInfo.location, 30, leftY)
          leftY += 15
        }

        // 技能在左侧
        if (resumeData.skills.length > 0) {
          leftY += 20
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#475569')
            .text('SKILLS', 30, leftY)
          
          leftY += 20
          resumeData.skills.forEach((skillGroup) => {
            doc
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(skillGroup.category, 30, leftY)
            leftY += 12
            
            skillGroup.items.forEach((skill) => {
              doc
                .fontSize(8)
                .font('Helvetica')
                .text(`• ${skill}`, 35, leftY)
              leftY += 10
            })
            leftY += 5
          })
        }

        // 右侧主要内容
        if (resumeData.personalInfo.summary) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text('PROFESSIONAL SUMMARY', 220, currentY)
          
          currentY += 20
          
          doc
            .fontSize(10)
            .font('Helvetica')
            .fillColor('#374151')
            .text(resumeData.personalInfo.summary, 220, currentY, {
              width: 345,
              align: 'justify'
            })
          
          currentY += doc.heightOfString(resumeData.personalInfo.summary, {
            width: 345
          }) + 25
        }

        // 工作经历
        if (resumeData.experiences.length > 0) {
          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text('EXPERIENCE', 220, currentY)
          
          currentY += 20

          resumeData.experiences.forEach((exp) => {
            doc
              .fontSize(11)
              .font('Helvetica-Bold')
              .fillColor('#1e293b')
              .text(`${exp.position}`, 220, currentY)
            
            doc
              .fontSize(10)
              .font('Helvetica')
              .fillColor('#6366f1')
              .text(`${exp.company}`, 220, currentY + 12)
            
            const dateRange = exp.isCurrent 
              ? `${exp.startDate} - Present`
              : `${exp.startDate} - ${exp.endDate || ''}`
            
            doc
              .fontSize(9)
              .font('Helvetica')
              .fillColor('#6b7280')
              .text(dateRange, 220, currentY + 24)
            
            currentY += 40

            if (exp.description) {
              doc
                .fontSize(10)
                .font('Helvetica')
                .fillColor('#374151')
                .text(exp.description, 220, currentY, {
                  width: 345
                })
              
              currentY += doc.heightOfString(exp.description, {
                width: 345
              }) + 15
            }
          })
        }

        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }
}

// 模板管理器
export class TemplateManager {
  private templates: Map<string, PDFTemplate> = new Map()

  constructor() {
    this.registerTemplate(new ClassicTemplate())
    this.registerTemplate(new ModernTemplate())
  }

  registerTemplate(template: PDFTemplate) {
    this.templates.set(template.name, template)
  }

  getTemplate(name: string): PDFTemplate | undefined {
    return this.templates.get(name)
  }

  getAllTemplates(): PDFTemplate[] {
    return Array.from(this.templates.values())
  }

  async generatePDF(templateName: string, resumeData: ResumeData): Promise<Buffer> {
    const template = this.getTemplate(templateName)
    if (!template) {
      throw new Error(`Template "${templateName}" not found`)
    }
    return template.generate(resumeData)
  }
}
