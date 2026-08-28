import { describe, it, expectTypeOf } from 'vitest';
import type {
  ToolManifest,
  ToolRegistration,
  User,
  DashboardTool,
} from '../types';
import { APP_NAME, APP_DESCRIPTION, DEFAULT_REDIRECT } from '../constants';

describe('ToolManifest type', () => {
  it('requires id field', () => {
    const manifest = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test'],
      enabled: true,
    } satisfies ToolManifest;
    expectTypeOf(manifest.id).toBeString();
  });

  it('requires name field', () => {
    const manifest = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test'],
      enabled: true,
    } satisfies ToolManifest;
    expectTypeOf(manifest.name).toBeString();
  });

  it('requires icon field', () => {
    const manifest = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test'],
      enabled: true,
    } satisfies ToolManifest;
    expectTypeOf(manifest.icon).toBeString();
  });

  it('requires description field', () => {
    const manifest = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test'],
      enabled: true,
    } satisfies ToolManifest;
    expectTypeOf(manifest.description).toBeString();
  });

  it('requires routes array field', () => {
    const manifest = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test', '/test/:id'],
      enabled: true,
    } satisfies ToolManifest;
    expectTypeOf(manifest.routes).toBeArray();
    expectTypeOf(manifest.routes[0]).toMatchTypeOf<string | undefined>();
  });

  it('requires enabled boolean field', () => {
    const manifest = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test'],
      enabled: true,
    } satisfies ToolManifest;
    expectTypeOf(manifest.enabled).toBeBoolean();
  });

  it('accepts valid ToolManifest with all fields', () => {
    const manifest: ToolManifest = {
      id: 'core-hour',
      name: 'CoreHour',
      icon: 'clock',
      description: 'Plan, focus, and review local work sessions',
      routes: ['/tools/core-hour', '/tools/core-hour/history'],
      enabled: true,
    };
    expectTypeOf(manifest).toEqualTypeOf<ToolManifest>();
  });
});

describe('ToolRegistration type', () => {
  it('has manifest and component properties', () => {
 const registration: ToolRegistration = {
 manifest: {
 id: 'test-tool',
 name: 'Test Tool',
 icon: '📋',
 description: 'A test tool',
 routes: ['/test'],
 enabled: true,
 },
 component: async () => Promise.resolve({ default: () => null }),
 };
 expectTypeOf(registration.manifest).toEqualTypeOf<ToolManifest>();
    expectTypeOf(registration.component).toBeFunction();
  });
});

describe('User type', () => {
  it('has required id field', () => {
    const user = { id: '123' } satisfies User;
    expectTypeOf(user.id).toBeString();
  });

  it('has email field', () => {
    const user = { id: '123', email: 'test@example.com' } satisfies User;
    expectTypeOf(user.email).toBeString();
  });

  it('accepts Supabase User structure', () => {
    const user: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      created_at: '2024-01-01T00:00:00.000Z',
    };
    expectTypeOf(user).toEqualTypeOf<User>();
  });
});

describe('DashboardTool type', () => {
  it('extends ToolManifest with lastUsed and usageCount', () => {
    const tool: DashboardTool = {
      id: 'test-tool',
      name: 'Test Tool',
      icon: '📋',
      description: 'A test tool',
      routes: ['/test'],
      enabled: true,
      lastUsed: '2024-01-15T10:30:00.000Z',
      usageCount: 42,
    };
    expectTypeOf(tool.lastUsed).toEqualTypeOf<string | undefined>();
 expectTypeOf(tool.usageCount).toEqualTypeOf<number | undefined>();
 });

 it('has all ToolManifest fields plus dashboard fields', () => {
    const tool: DashboardTool = {
      id: 'core-hour',
      name: 'CoreHour',
      icon: '⏱️',
      description: 'Time tracking with check-ins',
      routes: ['/dashboard/core-hour'],
      enabled: true,
      lastUsed: '2024-06-01T08:00:00.000Z',
      usageCount: 150,
    };
    expectTypeOf(tool.id).toBeString();
    expectTypeOf(tool.name).toBeString();
    expectTypeOf(tool.icon).toBeString();
    expectTypeOf(tool.description).toBeString();
    expectTypeOf(tool.routes).toBeArray();
    expectTypeOf(tool.enabled).toBeBoolean();
 expectTypeOf(tool.lastUsed).toEqualTypeOf<string | undefined>();
 expectTypeOf(tool.usageCount).toEqualTypeOf<number | undefined>();
 });
});

describe('Constants', () => {
  it('APP_NAME is EfficiencyMemo', () => {
    expect(APP_NAME).toBe('EfficiencyMemo');
  });

  it('APP_DESCRIPTION is a non-empty string', () => {
    expect(typeof APP_DESCRIPTION).toBe('string');
    expect(APP_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it('DEFAULT_REDIRECT is /dashboard', () => {
    expect(DEFAULT_REDIRECT).toBe('/dashboard');
  });
});
