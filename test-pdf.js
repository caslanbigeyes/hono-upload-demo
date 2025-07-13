// 简单的PDF生成测试脚本
import PDFDocument from 'pdfkit';
import fs from 'fs';

// 创建测试PDF
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test-resume.pdf'));

// 添加内容
doc.fontSize(24).text('张三', 100, 100);
doc.fontSize(12).text('前端开发工程师', 100, 130);
doc.fontSize(10).text('邮箱: zhangsan@example.com | 电话: 13800138000', 100, 150);

// 添加分割线
doc.moveTo(100, 170).lineTo(500, 170).stroke();

// 工作经历
doc.fontSize(14).text('工作经历', 100, 190);
doc.fontSize(12).text('前端开发 - 播知科技', 100, 210);
doc.fontSize(10).text('2025-07 - 2025-12 | 杭州市', 100, 230);

// 结束文档
doc.end();

console.log('✅ PDF测试文件已生成: test-resume.pdf');
