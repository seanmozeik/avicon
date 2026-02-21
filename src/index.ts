import * as p from '@clack/prompts';
import { showBanner } from './ui/banner.js';
import { getConfig, setConfig, deleteConfig } from './lib/config.js';
import type { Provider, ViconConfig } from './lib/config.js';

// ── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function popFlag(flags: string[]): string | undefined {
  for (const flag of flags) {
    const i = args.indexOf(flag);
    if (i !== -1) {
      args.splice(i, 1);
      return flag;
    }
  }
  return undefined;
}

function popFlagValue(flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i !== -1 && i + 1 < args.length) {
    const val = args[i + 1];
    args.splice(i, 2);
    return val;
  }
  return undefined;
}

const providerOverride = popFlagValue('--provider') as Provider | undefined;

// ── Subcommands ───────────────────────────────────────────────────────────────

async function runSetup(): Promise<void> {
  await showBanner();
  p.intro('Configure vicon AI provider');

  const provider = await p.select<Provider>({
    message: 'Which AI provider?',
    options: [
      { value: 'cloudflare' as Provider, label: 'Cloudflare AI', hint: 'requires Account ID + API token' },
      { value: 'claude' as Provider, label: 'Claude Code CLI', hint: 'requires claude CLI installed' },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  if ((provider as Provider) === 'cloudflare') {
    const accountId = await p.text({
      message: 'Cloudflare Account ID:',
      validate: (v) => (v?.trim() ? undefined : 'Required'),
    });
    if (p.isCancel(accountId)) { p.cancel('Setup cancelled.'); process.exit(0); }

    const apiToken = await p.password({
      message: 'Cloudflare AI API token:',
      validate: (v) => (v?.trim() ? undefined : 'Required'),
    });
    if (p.isCancel(apiToken)) { p.cancel('Setup cancelled.'); process.exit(0); }

    const config: ViconConfig = {
      defaultProvider: 'cloudflare',
      cloudflare: { accountId: (accountId as string).trim(), apiToken: (apiToken as string).trim() },
    };

    try {
      await setConfig(config);
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    p.outro('Cloudflare AI configured and saved.');
  } else {
    // claude — verify CLI is available
    const proc = Bun.spawn(['which', 'claude'], { stdout: 'pipe', stderr: 'pipe' });
    await proc.exited;
    if (proc.exitCode !== 0) {
      p.log.error('claude CLI not found. Install it from https://claude.ai/code and re-run setup.');
      process.exit(1);
    }

    const config: ViconConfig = { defaultProvider: 'claude' };
    try {
      await setConfig(config);
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    p.outro('Claude Code CLI configured and saved.');
  }
}

async function runTeardown(): Promise<void> {
  await showBanner();

  const confirm = await p.confirm({
    message: 'Delete vicon config from keychain?',
    initialValue: false,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.outro('Teardown cancelled.');
    process.exit(0);
  }

  await deleteConfig();
  p.outro('Config deleted.');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const subcommand = args[0];

if (subcommand === 'setup') {
  await runSetup();
} else if (subcommand === 'teardown') {
  await runTeardown();
} else {
  // Remaining args: conversion request or bare invocation
  // Config is loaded here so --provider override can be applied
  let config = await getConfig();

  if (providerOverride) {
    if (config) {
      config = { ...config, defaultProvider: providerOverride };
    } else {
      config = { defaultProvider: providerOverride };
    }
  }

  if (!config) {
    await showBanner();
    p.log.error('No provider configured. Run: vicon setup');
    process.exit(1);
  }

  if (config.defaultProvider === 'cloudflare' && !config.cloudflare) {
    await showBanner();
    p.log.error('Cloudflare credentials missing. Run: vicon setup');
    process.exit(1);
  }

  // US-005 will implement the full conversion flow here.
  await showBanner();
  p.log.info('vicon is ready. (Conversion flow coming in US-005)');
}
