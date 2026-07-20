const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/const data = \{ results: Array\.from\(uniqueMap\.values\(\)\) \};\n\s*const allResults = data\.results \|\| \[\];/, 'const data = { results: Array.from(uniqueMap.values()) };\n        const finalResults = data.results || [];');
html = html.replace(/if \(allResults\.length === 0\) \{/, 'if (finalResults.length === 0) {');
html = html.replace(/allResults\.push\(\{/g, 'finalResults.push({');
html = html.replace(/allResults\.forEach\(item => uniqueMap\.set\(item\.id, item\)\);/g, 'finalResults.forEach(item => uniqueMap.set(item.id, item));');
// wait I should just do it more cleanly.
