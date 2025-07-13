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

export class FixedPDFGenerator {
  private doc: PDFKit.PDFDocument
  private currentY: number = 50
  private pageMargin = 50
  private pageWidth = 595.28 // A4 width in points
  private contentWidth = this.pageWidth - (this.pageMargin * 2)
  private chineseFontRegistered = false
  private forceEnglish = false

  constructor(options: { language?: 'auto' | 'chinese' | 'english' } = {}) {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.pageMargin,
      info: {
        Title: 'Resume',
        Author: 'Resume Builder',
        Subject: 'Professional Resume'
      }
    })

    // 设置语言选项
    if (options.language === 'english') {
      this.forceEnglish = true
      console.log('🌐 PDF language set to English (forced)')
    } else if (options.language === 'chinese') {
      this.forceEnglish = false
      console.log('🌐 PDF language set to Chinese (forced)')
    } else {
      console.log('🌐 PDF language set to Auto (detect font availability)')
    }

    this.setupChineseFont()
  }

  private setupChineseFont() {
    try {
      // 尝试使用系统中文字体 - 只查找TTF/OTF格式，跳过TTC格式
      const fontPaths = [
        // macOS 系统字体 (TTF/OTF only)
        '/Library/Fonts/Arial Unicode MS.ttf',
        '/System/Library/Fonts/Helvetica.ttc', // 虽然是TTC，但PDFKit可能支持
        // Windows 系统字体
        'C:\\Windows\\Fonts\\msyh.ttf',
        'C:\\Windows\\Fonts\\simsun.ttf',
        'C:\\Windows\\Fonts\\simhei.ttf',
        // Linux 系统字体
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      ]

      for (const fontPath of fontPaths) {
        if (fs.existsSync(fontPath)) {
          try {
            // 只注册TTF格式的字体
            if (fontPath.endsWith('.ttf') || fontPath.endsWith('.otf')) {
              this.doc.registerFont('ChineseFont', fontPath)
              this.doc.registerFont('ChineseFontBold', fontPath)
              this.chineseFontRegistered = true
              console.log(`✅ Successfully registered Chinese font: ${fontPath}`)
              break
            }
          } catch (error) {
            console.log(`❌ Failed to register font ${fontPath}:`, error)
          }
        }
      }

      if (!this.chineseFontRegistered) {
        console.log('⚠️  No compatible Chinese font found, using text translation fallback')
      }
    } catch (error) {
      console.log('❌ Error setting up Chinese font:', error)
    }
  }

  private getFont(bold: boolean = false): string {
    if (this.chineseFontRegistered) {
      return bold ? 'ChineseFontBold' : 'ChineseFont'
    }
    // 使用标准字体作为fallback
    return bold ? 'Helvetica-Bold' : 'Helvetica'
  }

  // 处理中文字符 - 根据设置决定是否翻译
  private processText(text: string): string {
    if (this.forceEnglish || !this.chineseFontRegistered) {
      // 强制英文或没有中文字体时进行翻译
    } else {
      // 有中文字体且未强制英文时保持原文
      return text
    }
    
    // 如果没有中文字体，提供完整的中文到英文映射
    const chineseToEnglish: { [key: string]: string } = {
      // 基本标题
      '个人简介': 'Personal Summary',
      '工作经历': 'Work Experience',
      '教育经历': 'Education',
      '项目经历': 'Projects',
      '技能专长': 'Skills',
      '至今': 'Present',
      '技术栈': 'Tech Stack',

      // 个人信息
      '李灵峰': 'Li Lingfeng',
      '杭州市': 'Hangzhou',
      '浙江省': 'Zhejiang Province',
      '中国': 'China',

      // 公司名称
      '播知科技': 'Bozhi Technology',
      '阿里巴巴': 'Alibaba',
      '腾讯': 'Tencent',
      '百度': 'Baidu',
      '字节跳动': 'ByteDance',
      '美团': 'Meituan',
      '滴滴': 'Didi',
      '京东': 'JD.com',
      '网易': 'NetEase',
      '小米': 'Xiaomi',

      // 职位名称
      '前端开发': 'Frontend Developer',
      '后端开发': 'Backend Developer',
      '全栈开发': 'Full Stack Developer',
      '软件工程师': 'Software Engineer',
      '高级工程师': 'Senior Engineer',
      '技术经理': 'Technical Manager',
      '产品经理': 'Product Manager',
      '项目经理': 'Project Manager',
      '架构师': 'Architect',
      '技术总监': 'CTO',
      '开发工程师': 'Development Engineer',
      '算法工程师': 'Algorithm Engineer',
      '数据工程师': 'Data Engineer',
      '运维工程师': 'DevOps Engineer',
      '测试工程师': 'QA Engineer',
      'UI设计师': 'UI Designer',
      'UX设计师': 'UX Designer',

      // 学校名称
      '清华大学': 'Tsinghua University',
      '北京大学': 'Peking University',
      '复旦大学': 'Fudan University',
      '上海交通大学': 'Shanghai Jiao Tong University',
      '浙江大学': 'Zhejiang University',
      '南京大学': 'Nanjing University',
      '中山大学': 'Sun Yat-sen University',
      '华中科技大学': 'Huazhong University of Science and Technology',
      '西安交通大学': 'Xi\'an Jiaotong University',
      '哈尔滨工业大学': 'Harbin Institute of Technology',
      '同济大学': 'Tongji University',
      '东南大学': 'Southeast University',
      '天津大学': 'Tianjin University',
      '华南理工大学': 'South China University of Technology',
      '北京理工大学': 'Beijing Institute of Technology',
      '大连理工大学': 'Dalian University of Technology',
      '西北工业大学': 'Northwestern Polytechnical University',
      '电子科技大学': 'University of Electronic Science and Technology of China',

      // 学位
      '本科': 'Bachelor\'s Degree',
      '硕士': 'Master\'s Degree',
      '博士': 'PhD',
      '学士学位': 'Bachelor\'s Degree',
      '硕士学位': 'Master\'s Degree',
      '博士学位': 'PhD',
      '专科': 'Associate Degree',
      '高中': 'High School',

      // 专业
      '计算机科学': 'Computer Science',
      '软件工程': 'Software Engineering',
      '信息技术': 'Information Technology',
      '电子工程': 'Electronic Engineering',
      '通信工程': 'Communication Engineering',
      '自动化': 'Automation',
      '机械工程': 'Mechanical Engineering',
      '电气工程': 'Electrical Engineering',
      '土木工程': 'Civil Engineering',
      '化学工程': 'Chemical Engineering',
      '生物工程': 'Bioengineering',
      '环境工程': 'Environmental Engineering',
      '工商管理': 'Business Administration',
      '市场营销': 'Marketing',
      '会计学': 'Accounting',
      '金融学': 'Finance',
      '经济学': 'Economics',
      '法学': 'Law',
      '英语': 'English',
      '日语': 'Japanese',
      '韩语': 'Korean',
      '德语': 'German',
      '法语': 'French',

      // 技能分类
      '编程语言': 'Programming Languages',
      '前端技术': 'Frontend Technologies',
      '后端技术': 'Backend Technologies',
      '数据库': 'Databases',
      '开发工具': 'Development Tools',
      '框架': 'Frameworks',
      '云服务': 'Cloud Services',
      '移动开发': 'Mobile Development',
      '人工智能': 'Artificial Intelligence',
      '机器学习': 'Machine Learning',
      '深度学习': 'Deep Learning',
      '大数据': 'Big Data',
      '区块链': 'Blockchain',
      '物联网': 'IoT',
      '网络安全': 'Cybersecurity',
      '运维': 'DevOps',
      '测试': 'Testing',
      '设计': 'Design',
      '产品': 'Product',
      '管理': 'Management',

      // 常用词汇
      '项目': 'Project',
      '系统': 'System',
      '平台': 'Platform',
      '应用': 'Application',
      '网站': 'Website',
      '移动端': 'Mobile',
      '桌面端': 'Desktop',
      '服务器': 'Server',
      '客户端': 'Client',
      '接口': 'API',
      '数据': 'Data',
      '算法': 'Algorithm',
      '架构': 'Architecture',
      '设计': 'Design',
      '开发': 'Development',
      '测试': 'Testing',
      '部署': 'Deployment',
      '维护': 'Maintenance',
      '优化': 'Optimization',
      '重构': 'Refactoring',
      '调试': 'Debugging',
      '文档': 'Documentation',
      '培训': 'Training',
      '团队': 'Team',
      '协作': 'Collaboration',
      '沟通': 'Communication',
      '领导': 'Leadership',
      '管理': 'Management',
      '分析': 'Analysis',
      '解决': 'Solution',
      '实现': 'Implementation',
      '完成': 'Completion',
      '成功': 'Success',
      '提升': 'Improvement',
      '增长': 'Growth',
      '效率': 'Efficiency',
      '质量': 'Quality',
      '性能': 'Performance',
      '安全': 'Security',
      '稳定': 'Stability',
      '可靠': 'Reliability',
      '扩展': 'Scalability',
      '维护': 'Maintainability',
      '用户': 'User',
      '客户': 'Customer',
      '业务': 'Business',
      '需求': 'Requirements',
      '功能': 'Features',
      '模块': 'Module',
      '组件': 'Component',
      '服务': 'Service',
      '工具': 'Tool',
      '流程': 'Process',
      '方法': 'Method',
      '技术': 'Technology',
      '经验': 'Experience',
      '能力': 'Ability',
      '技能': 'Skills',
      '知识': 'Knowledge',
      '学习': 'Learning',
      '研究': 'Research',
      '创新': 'Innovation',
      '解决方案': 'Solution',
      '最佳实践': 'Best Practices',
      '代码审查': 'Code Review',
      '版本控制': 'Version Control',
      '持续集成': 'CI/CD',
      '敏捷开发': 'Agile Development',
      '瀑布模型': 'Waterfall Model',
      '微服务': 'Microservices',
      '容器化': 'Containerization',
      '虚拟化': 'Virtualization',
      '负载均衡': 'Load Balancing',
      '高可用': 'High Availability',
      '容灾': 'Disaster Recovery',
      '监控': 'Monitoring',
      '日志': 'Logging',
      '备份': 'Backup',
      '恢复': 'Recovery'
    }

    let processedText = text
    for (const [chinese, english] of Object.entries(chineseToEnglish)) {
      processedText = processedText.replace(new RegExp(chinese, 'g'), english)
    }

    return processedText
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
      .fontSize(32)
      .font(this.getFont(true))
      .fillColor('#1f2937')
      .text(this.processText(personalInfo.name), this.pageMargin, this.currentY, {
        align: 'center',
        width: this.contentWidth
      })
    
    this.currentY += 45

    // 联系信息
    const contactInfo = [
      personalInfo.email,
      personalInfo.phone,
      this.processText(personalInfo.location || ''),
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
        .text(this.processText(personalInfo.summary), this.pageMargin, this.currentY, {
          width: this.contentWidth,
          align: 'justify',
          lineGap: 2
        })
      
      this.currentY += this.doc.heightOfString(this.processText(personalInfo.summary), {
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
        .text(`${this.processText(exp.position)} - ${this.processText(exp.company)}`, this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 时间和地点
      const dateRange = exp.isCurrent 
        ? `${exp.startDate} - ${this.processText('至今')}`
        : `${exp.startDate} - ${exp.endDate || ''}`
      
      this.doc
        .fontSize(10)
        .font(this.getFont())
        .fillColor('#6b7280')
        .text(`${dateRange}${exp.location ? ` | ${this.processText(exp.location)}` : ''}`, 
               this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 描述
      if (exp.description) {
        this.doc
          .fontSize(11)
          .font(this.getFont())
          .fillColor('#374151')
          .text(this.processText(exp.description), this.pageMargin, this.currentY, {
            width: this.contentWidth,
            lineGap: 1
          })
        
        this.currentY += this.doc.heightOfString(this.processText(exp.description), {
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
              .text(`• ${this.processText(achievement)}`, this.pageMargin + 15, this.currentY, {
                width: this.contentWidth - 15,
                lineGap: 1
              })
            
            this.currentY += this.doc.heightOfString(`• ${this.processText(achievement)}`, {
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
        .text(`${this.processText(edu.degree)} - ${this.processText(edu.major)}`, this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 学校和时间
      const dateRange = edu.isCurrent 
        ? `${edu.startDate} - ${this.processText('至今')}`
        : `${edu.startDate} - ${edu.endDate || ''}`
      
      this.doc
        .fontSize(10)
        .font(this.getFont())
        .fillColor('#6b7280')
        .text(`${this.processText(edu.school)} | ${dateRange}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`, 
               this.pageMargin, this.currentY)
      
      this.currentY += 18

      // 描述
      if (edu.description) {
        this.doc
          .fontSize(11)
          .font(this.getFont())
          .fillColor('#374151')
          .text(this.processText(edu.description), this.pageMargin, this.currentY, {
            width: this.contentWidth,
            lineGap: 1
          })
        
        this.currentY += this.doc.heightOfString(this.processText(edu.description), {
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
        .text(this.processText(project.name), this.pageMargin, this.currentY)
      
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
          .text(this.processText(project.description), this.pageMargin, this.currentY, {
            width: this.contentWidth,
            lineGap: 1
          })
        
        this.currentY += this.doc.heightOfString(this.processText(project.description), {
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
          .text(`${this.processText('技术栈')}: `, this.pageMargin, this.currentY, { continued: true })
          .font(this.getFont())
          .text(project.technologies.map(tech => this.processText(tech)).join(', '))
        
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
        .text(`${this.processText(skillGroup.category)}: `, this.pageMargin, this.currentY, { continued: true })
        .font(this.getFont())
        .text(skillGroup.items.map(item => this.processText(item)).join(', '))
      
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
      .text(this.processText(title), this.pageMargin + 15, this.currentY)
    
    this.currentY += 28

    // 添加装饰性下划线
    this.doc
      .moveTo(this.pageMargin + 15, this.currentY - 10)
      .lineTo(this.pageMargin + 15 + this.doc.widthOfString(this.processText(title), { fontSize: 16 }) + 20, this.currentY - 10)
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
