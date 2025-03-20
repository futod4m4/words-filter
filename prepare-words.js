const fs = require('fs');
const path = require('path');

const sourcePath = './words.json';
const targetPath = path.join(__dirname, 'extension/words.json');

try {
  let content = fs.readFileSync(sourcePath, 'utf-8');
  
  if (!content.trim().startsWith('[')) {
    content = '[' + content + ']';
  }
  
  content = content.replace(/},\s*}/g, '}}');
  content = content.replace(/},\s*$/g, '}');
  content = content.replace(/}\s*{/g, '},{');
  
  const words = JSON.parse(content);
  
  words.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  
  fs.writeFileSync(targetPath, JSON.stringify(words), 'utf-8');
  console.log(`Успешно обработано ${words.length} слов и сохранено в ${targetPath}`);
} catch (error) {
  console.error('Ошибка при обработке файла:', error);
}