import { chromium } from 'playwright';
import fs from 'fs';

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Inline static HTML - no React needed
    function renderSidebar(isCollapsed, activeTool) {
      const tools = [
        { id: 'tool-a', name: 'Charger Reminder', icon: '🔋' },
        { id: 'tool-b', name: 'Core Hour', icon: '⏱️' },
      ];
      
      const widthClass = isCollapsed ? 'w-16' : 'w-60';
      const titleHtml = !isCollapsed ? '<span class="font-semibold text-sm truncate">EfficiencyMemo</span>' : '';
      
      const toolsHtml = tools.map(tool => {
        const isActive = tool.id === activeTool;
        const activeClass = isActive 
          ? 'bg-neutral-800 text-white' 
          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white';
        const nameClass = isCollapsed ? 'hidden' : 'block';
        return \`
          <li>
            <button
              data-testid="sidebar-tool-item-\${tool.id}"
              data-active="\${isActive}"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 \${activeClass}"
            >
              <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center">\${tool.icon}</span>
              <span data-testid="tool-name" class="text-sm font-medium truncate transition-all duration-200 \${nameClass}">\${tool.name}</span>
            </button>
          </li>
        \`;
      }).join('');
      
      return \`
        <aside data-testid="sidebar" class="flex flex-col h-full bg-neutral-900 text-white transition-all duration-200 ease-in-out \${widthClass}">
          <div class="flex items-center justify-between p-3 border-b border-neutral-800">
            \${titleHtml}
            <button data-testid="sidebar-toggle" onclick="toggleSidebar()" class="p-1.5 rounded-md hover:bg-neutral-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
          <nav class="flex-1 overflow-y-auto py-2">
            <ul class="space-y-1 px-2">\${toolsHtml}</ul>
          </nav>
        </aside>
      \`;
    }

    let collapsed = false;
    let activeTool = 'tool-a';

    function render() {
      document.getElementById('root').innerHTML = \`
        <div class="flex h-screen">
          \${renderSidebar(collapsed, activeTool)}
          <div class="flex-1 p-8 bg-neutral-50">
            <h1 class="text-2xl font-bold mb-4">Task 5: Sidebar Toggle Demo</h1>
            <p>Active tool: \${activeTool}</p>
            <p>Collapsed: \${collapsed ? 'Yes' : 'No'}</p>
          </div>
        </div>
      \`;
    }

    function toggleSidebar() {
      collapsed = !collapsed;
      render();
    }

    render();
  </script>
</body>
</html>
`;

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const tmpFile = 'tmp-sidebar.html';
  fs.writeFileSync(tmpFile, html);
  await page.goto('file://' + process.cwd() + '/' + tmpFile);
  
  await page.waitForTimeout(500);

  // Screenshot expanded
  await page.screenshot({ path: '.omo/evidence/task-5-sidebar-toggle.png' });

  // Click toggle to collapse
  await page.click('[data-testid="sidebar-toggle"]');
  await page.waitForTimeout(500);

  // Screenshot collapsed
  await page.screenshot({ path: '.omo/evidence/task-5-sidebar-toggle.png' });

  await browser.close();
  fs.unlinkSync(tmpFile);
  console.log('Screenshot saved to .omo/evidence/task-5-sidebar-toggle.png');
}

capture().catch(console.error);
