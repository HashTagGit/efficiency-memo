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
      const sidebarHtml = renderSidebar(collapsed, activeTool);
      
      document.getElementById('root').innerHTML = \`
        <div class="flex h-screen w-full bg-neutral-50">
          <!-- Desktop Sidebar -->
          <div data-testid="desktop-sidebar" class="hidden md:flex h-full flex-shrink-0">
            \${sidebarHtml}
          </div>

          <!-- Main Content Area -->
          <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <!-- Header -->
            <header data-testid="shell-header" class="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200">
              <div class="flex items-center gap-3">
                <button data-testid="mobile-menu-button" class="md:hidden p-2 rounded-md hover:bg-neutral-100 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <span class="text-sm text-neutral-600 truncate max-w-[200px]">user@example.com</span>
              </div>
              <button data-testid="sign-out-button" class="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors">
                Sign out
              </button>
            </header>

            <!-- Page Content -->
            <main class="flex-1 overflow-auto p-4">
              <div data-testid="shell-children">
                <h1 class="text-2xl font-bold">Hello World</h1>
                <p class="text-neutral-600 mt-2">This is the main content area of the Shell layout.</p>
              </div>
            </main>
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

  const tmpFile = 'tmp-shell.html';
  fs.writeFileSync(tmpFile, html);
  await page.goto('file://' + process.cwd() + '/' + tmpFile);
  
  await page.waitForTimeout(500);

  // Screenshot shell layout
  await page.screenshot({ path: '.omo/evidence/task-5-shell-render.png' });

  await browser.close();
  fs.unlinkSync(tmpFile);
  console.log('Screenshot saved to .omo/evidence/task-5-shell-render.png');
}

capture().catch(console.error);
