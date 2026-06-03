#!/usr/bin/env node

/**
 * 🚀 VALIDADOR AUTOMÁTICO - EduGuard360 Campos
 * 
 * Valida automaticamente se todos os campos principais estão funcionando
 * 
 * Uso: node field-validator.js
 * 
 * Requisitos:
 * - npm install axios chalk table-format
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.BASE_URL || 'https://eduguard360.co.mz';
const LOCAL_URL = 'http://localhost:5173';

// Cores para output
const colors = {
  pass: chalk.green('✅'),
  fail: chalk.red('❌'),
  warn: chalk.yellow('⚠️'),
  info: chalk.blue('ℹ️'),
  title: chalk.bold.cyan,
  section: chalk.bold.magenta,
};

// Armazenar resultados
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * Função para testar uma URL
 */
async function testRoute(name, url, expectedContent = '') {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'EduGuard360-Validator' },
      timeout: 5000,
    });

    const hasContent = !expectedContent || response.data.includes(expectedContent);

    if (response.status === 200 && hasContent) {
      results.passed++;
      results.tests.push({ name, status: 'PASS', url });
      console.log(`${colors.pass} ${name} [${response.status}]`);
      return true;
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', url, reason: 'Conteúdo não encontrado' });
      console.log(`${colors.fail} ${name} - Conteúdo inválido`);
      return false;
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', url, reason: error.message });
    console.log(`${colors.fail} ${name} - ${error.message.split('\n')[0]}`);
    return false;
  }
}

/**
 * Função para testar componentes específicos no HTML
 */
async function testComponent(name, url, selectors = []) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    const html = response.data;

    let allFound = true;
    for (const selector of selectors) {
      if (!html.includes(selector)) {
        allFound = false;
        break;
      }
    }

    if (allFound) {
      results.passed++;
      results.tests.push({ name, status: 'PASS', url });
      console.log(`${colors.pass} ${name}`);
      return true;
    } else {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', url, reason: 'Componente faltando' });
      console.log(`${colors.fail} ${name} - Componente não encontrado`);
      return false;
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', url, reason: error.message });
    console.log(`${colors.fail} ${name} - Erro ao testar`);
    return false;
  }
}

/**
 * Executar validação
 */
async function runValidation() {
  console.log(colors.title(`\n🚀 EduGuard360 - Validador de Campos\n`));
  console.log(`🔍 Base URL: ${BASE_URL}\n`);

  // ============================================
  // 1. ROTAS PRINCIPAIS
  // ============================================
  console.log(colors.section(`\n📍 1. VERIFICAÇÃO DE ROTAS PRINCIPAIS\n`));

  await testRoute('Home Page', `${BASE_URL}/`, 'EduGuard');
  await testRoute('Portals Hub', `${BASE_URL}/portais`, 'Portal');
  await testRoute('Literature Portal', `${BASE_URL}/literatura`, 'Literatura');
  await testRoute('EduMarket Portal', `${BASE_URL}/edumarket`, 'Curso');
  await testRoute('System Portal', `${BASE_URL}/sistema`, 'Login');

  // ============================================
  // 2. LITERATURA - COMPONENTES
  // ============================================
  console.log(colors.section(`\n📖 2. LITERATURA - COMPONENTES\n`));

  await testComponent('Hero Section', `${BASE_URL}/literatura`, [
    'Literatura Aberta',
    'class="from-amber-600"',
  ]);

  await testComponent('Search Input', `${BASE_URL}/literatura`, [
    'Buscar livros',
    'placeholder',
    'class="text-black"',
  ]);

  await testComponent('Filter Sidebar', `${BASE_URL}/literatura`, [
    'Idioma',
    'Licença',
    'Assunto',
    'País',
    'Fonte',
  ]);

  await testComponent('Tabs', `${BASE_URL}/literatura`, [
    'Explorar',
    'Coleções',
    'Moçambique',
    'Guardados',
  ]);

  // ============================================
  // 3. HUB DE PORTAIS - CARDS
  // ============================================
  console.log(colors.section(`\n🏛️ 3. HUB DE PORTAIS - CARDS\n`));

  await testComponent('Portal Cards', `${BASE_URL}/portais`, [
    'Segurança Escolar',
    'EduMarket',
    'Literatura Aberta',
    'Novo',
  ]);

  // ============================================
  // 4. NAVEGAÇÃO
  // ============================================
  console.log(colors.section(`\n🧭 4. NAVEGAÇÃO GLOBAL\n`));

  await testComponent('Navigation Menu', `${BASE_URL}/`, [
    'Início',
    'Sobre',
    'Contacto',
    'Portais',
  ]);

  // ============================================
  // 5. RESPONSIVIDADE (Meta tags)
  // ============================================
  console.log(colors.section(`\n📱 5. RESPONSIVIDADE\n`));

  await testComponent('Meta Tags', `${BASE_URL}/`, [
    'viewport',
    'width=device-width',
    'initial-scale=1',
  ]);

  // ============================================
  // 6. SEO
  // ============================================
  console.log(colors.section(`\n🔍 6. SEO BASICS\n`));

  await testComponent('SEO Meta', `${BASE_URL}/`, [
    '<title>',
    'meta name="description"',
  ]);

  // ============================================
  // RELATÓRIO FINAL
  // ============================================
  console.log(colors.section(`\n📊 RELATÓRIO FINAL\n`));

  const total = results.passed + results.failed;
  const percentage = Math.round((results.passed / total) * 100);

  console.log(`${colors.pass} Testes Passaram: ${results.passed}`);
  console.log(`${colors.fail} Testes Falharam: ${results.failed}`);
  console.log(`${colors.warn} Taxa de Sucesso: ${percentage}%\n`);

  if (percentage === 100) {
    console.log(colors.title('✨ TODOS OS CAMPOS FUNCIONANDO PERFEITAMENTE!\n'));
  } else if (percentage >= 80) {
    console.log(colors.warn(`⚠️ Alguns campos precisam de atenção (${100 - percentage}% falhas)\n`));
  } else {
    console.log(colors.fail(`❌ Múltiplos problemas encontrados. Revisar antes de deploiar.\n`));
  }

  // Detalhes dos testes falhados
  if (results.failed > 0) {
    console.log(colors.section('\n🔴 DETALHES DOS TESTES FALHADOS:\n'));
    results.tests
      .filter((t) => t.status === 'FAIL')
      .forEach((test) => {
        console.log(`${colors.fail} ${test.name}`);
        console.log(`   URL: ${test.url}`);
        console.log(`   Razão: ${test.reason}\n`);
      });
  }

  // JSON report para CI/CD
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total,
      passed: results.passed,
      failed: results.failed,
      successRate: `${percentage}%`,
    },
    tests: results.tests,
  };

  console.log(colors.info(`\n💾 Report JSON salvo em: ./field-validation-report.json\n`));

  // Salvar relatório
  const fs = require('fs');
  fs.writeFileSync(
    './field-validation-report.json',
    JSON.stringify(report, null, 2)
  );

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Executar validação
runValidation().catch((error) => {
  console.error(colors.fail('Erro ao executar validação:'), error);
  process.exit(1);
});
