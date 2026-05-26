import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const baseProject = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  template_id: 'blank',
  name: '可删除项目',
  description: null,
  current_html: '<!DOCTYPE html><html><body><main>preview</main></body></html>',
  draft_html: null,
  selected_skills: [],
  design_profile: null,
  status: 'active',
  pinned: false,
  archived_at: null,
  thumbnail_url: null,
  onboarding_state: null,
  created_at: '2026-05-26T00:00:00.000Z',
  updated_at: '2026-05-26T00:00:00.000Z',
};

type ProjectFixture = typeof baseProject;
type ProjectState = { current: ProjectFixture[]; deleteCount: number };

async function mockProjects(page: Page, projects: ProjectState) {
  await page.route(/\/api\/projects(?:\/[^?]+)?(?:\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/projects' && request.method() === 'GET') {
      await route.fulfill({ json: projects.current });
      return;
    }

    if (url.pathname === `/api/projects/${baseProject.id}` && request.method() === 'DELETE') {
      projects.deleteCount += 1;
      projects.current = [];
      await route.fulfill({ json: { success: true } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: 'unmocked request' } });
  });
}

test('project card menu deletes a personal project', async ({ authenticatedPage: page }) => {
  const projects = { current: [baseProject], deleteCount: 0 };
  await mockProjects(page, projects);
  page.on('dialog', dialog => dialog.accept());

  await page.goto('/projects');

  await expect(page.getByRole('heading', { name: '可删除项目' })).toBeVisible();
  await page.getByRole('button', { name: '更多操作' }).click();
  await expect(page.getByRole('button', { name: '删除项目' })).toBeVisible();
  await page.getByRole('button', { name: '删除项目' }).click();

  await expect.poll(() => projects.deleteCount).toBe(1);
});

test('project card renders generated previews in the card viewport', async ({ authenticatedPage: page }) => {
  const project = {
    ...baseProject,
    name: '脚本预览项目',
    current_html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div id="root"></div>
  <script>
    document.getElementById('root').innerHTML =
      '<main data-testid="preview-viewport">' + window.innerWidth + 'x' + window.innerHeight + '</main>';
  </script>
</body>
</html>`,
  };
  const projects = { current: [project], deleteCount: 0 };
  await mockProjects(page, projects);

  await page.goto('/projects');

  const preview = page.frameLocator('iframe[title="脚本预览项目"]').getByTestId('preview-viewport');
  await expect(preview).toHaveText('1280x960');
});
