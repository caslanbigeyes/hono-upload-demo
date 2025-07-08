import { spawn } from 'child_process';

console.log('🚀 Starting Hono Upload Demo with Swagger UI...');
console.log('📦 Hono OpenAPI app initialized');
console.log('🗄️  Prisma client initialized');
console.log('🚀 Server with Swagger UI starting on port 3002...');

const server = spawn('tsx', ['server-swagger.ts'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// 等待一下让服务器启动
setTimeout(() => {
  console.log('✅ Server is running on http://localhost:3002');
  console.log('📝 Available endpoints:');
  console.log('   GET  http://localhost:3002/');
  console.log('   POST http://localhost:3002/upload');
  console.log('   GET  http://localhost:3002/images');
  console.log('   GET  http://localhost:3002/doc - OpenAPI JSON');
  console.log('   GET  http://localhost:3002/ui - Swagger UI');
  console.log('');
  console.log('🎯 Open Swagger UI: http://localhost:3002/ui');
  console.log('📄 Test page: file://' + process.cwd() + '/test-swagger.html');
}, 2000);

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit();
});
