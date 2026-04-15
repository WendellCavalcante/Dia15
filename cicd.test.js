
let passed = 0;
let failed = 0;
const results = [];

function test(description, fn) {
  try {
    fn();
    results.push({ ok: true, description });
    passed++;
  } catch (err) {
    results.push({ ok: false, description, error: err.message });
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected)
        throw new Error(`Esperado "${expected}", recebeu "${actual}"`);
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b)
        throw new Error(`Esperado ${b}, recebeu ${a}`);
    },
    toBeTruthy() {
      if (!actual)
        throw new Error(`Esperado valor verdadeiro, recebeu "${actual}"`);
    },
    toBeFalsy() {
      if (actual)
        throw new Error(`Esperado valor falso, recebeu "${actual}"`);
    },
    toContain(item) {
      if (!actual.includes(item))
        throw new Error(`"${actual}" não contém "${item}"`);
    },
    toBeGreaterThan(n) {
      if (actual <= n)
        throw new Error(`${actual} não é maior que ${n}`);
    },
    toThrow() {
      throw new Error('Use expect(fn).toThrow() com uma função');
    },
  };
}

function expectFn(fn) {
  return {
    toThrow(msg) {
      try {
        fn();
        throw new Error('Esperava que lançasse um erro, mas não lançou');
      } catch (err) {
        if (msg && !err.message.includes(msg))
          throw new Error(`Erro esperado contendo "${msg}", recebeu "${err.message}"`);
      }
    },
  };
}

function getPipelineStages() {
  return ['commit', 'build', 'test', 'security', 'artifact', 'deploy'];
}

function getStageStatus(stage) {
  const statuses = {
    commit:   'passed',
    build:    'passed',
    test:     'running',
    security: 'pending',
    artifact: 'pending',
    deploy:   'pending',
  };
  if (!statuses[stage]) throw new Error(`Stage desconhecida: "${stage}"`);
  return statuses[stage];
}

function isDeployReady(stages) {
  return stages.every(s => getStageStatus(s) === 'passed');
}

function formatBadge(repo, branch, status) {
  if (!repo || !branch || !status) throw new Error('Parâmetros inválidos para badge');
  return `${repo}/${branch} — ${status}`;
}

function calculateCoverage(totalLines, coveredLines) {
  if (totalLines <= 0) throw new Error('totalLines deve ser > 0');
  return Math.round((coveredLines / totalLines) * 100);
}

function parsePipelineResult(log) {
  const passed = (log.match(/✓/g) || []).length;
  const failed  = (log.match(/✗/g) || []).length;
  return { passed, failed, success: failed === 0 };
}


test('deve retornar 6 estágios no pipeline', () => {
  const stages = getPipelineStages();
  expect(stages.length).toBe(6);
});

test('pipeline deve conter estágio "deploy"', () => {
  expect(getPipelineStages()).toContain('deploy');
});

test('commit deve ter status "passed"', () => {
  expect(getStageStatus('commit')).toBe('passed');
});

test('test deve ter status "running"', () => {
  expect(getStageStatus('test')).toBe('running');
});

test('stage desconhecida deve lançar erro', () => {
  expectFn(() => getStageStatus('unknown')).toThrow('Stage desconhecida');
});

test('deploy NÃO deve estar pronto se há stages pendentes', () => {
  const ready = isDeployReady(getPipelineStages());
  expect(ready).toBeFalsy();
});

test('deploy deve estar pronto quando tudo passou', () => {
  const ready = isDeployReady(['commit', 'build']);
  expect(ready).toBeTruthy();
});

test('deve formatar badge corretamente', () => {
  const badge = formatBadge('myapp', 'main', 'passing');
  expect(badge).toBe('myapp/main — passing');
});

test('badge com parâmetros vazios deve lançar erro', () => {
  expectFn(() => formatBadge('', 'main', 'passing')).toThrow('inválidos');
});

test('deve calcular cobertura corretamente', () => {
  expect(calculateCoverage(200, 174)).toBe(87);
});

test('cobertura com 0 linhas deve lançar erro', () => {
  expectFn(() => calculateCoverage(0, 0)).toThrow('> 0');
});

test('cobertura deve ser maior que 80% (threshold)', () => {
  const cov = calculateCoverage(200, 174);
  expect(cov).toBeGreaterThan(80);
});

test('deve contar sucessos e falhas no log', () => {
  const log = '✓ build\n✓ lint\n✓ test\n✗ security';
  const result = parsePipelineResult(log);
  expect(result).toEqual({ passed: 3, failed: 1, success: false });
});

test('log sem falhas deve ser sucesso', () => {
  const log = '✓ build\n✓ test\n✓ deploy';
  const result = parsePipelineResult(log);
  expect(result.success).toBeTruthy();
});

console.log('\n╔══════════════════════════════════════════╗');
console.log('║   CI/CD — Resultados dos Testes          ║');
console.log('╚══════════════════════════════════════════╝\n');

results.forEach(r => {
  const icon = r.ok ? '✓' : '✗';
  const color = r.ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`  ${color}${icon}\x1b[0m  ${r.description}`);
  if (!r.ok) console.log(`       \x1b[33m↳ ${r.error}\x1b[0m`);
});

console.log('\n──────────────────────────────────────────');
console.log(`  Total:   ${passed + failed} testes`);
console.log(`  \x1b[32mPassed:  ${passed}\x1b[0m`);
if (failed > 0) {
  console.log(`  \x1b[31mFailed:  ${failed}\x1b[0m`);
} else {
  console.log(`  Failed:  ${failed}`);
}
const status = failed === 0 ? '\x1b[32m✓ PASSING\x1b[0m' : '\x1b[31m✗ FAILING\x1b[0m';
console.log(`  Status:  ${status}`);
console.log('──────────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
