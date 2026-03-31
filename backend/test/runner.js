const fs = require('fs');
const path = require('path');
const readline = require('readline');

let rl = null;

function createRunnerInterface() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function closeRunnerInterface() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function discoverTestModules() {
  const testDir = __dirname;
  const modules = [];

  try {
    const entries = fs.readdirSync(testDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const indexPath = path.join(testDir, entry.name, 'index.js');
        if (fs.existsSync(indexPath)) {
          modules.push({
            name: entry.name,
            path: indexPath,
            displayName: entry.name.charAt(0).toUpperCase() + entry.name.slice(1)
          });
        }
      }
    }
  } catch (err) {
    console.error('Error discovering test modules:', err.message);
  }

  return modules.sort((a, b) => a.name.localeCompare(b.name));
}

async function runModule(modulePath, moduleName) {
  try {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running tests for: ${moduleName}`);
    console.log(`${'='.repeat(50)}\n`);

    delete require.cache[require.resolve(modulePath)];
    const testModule = require(modulePath);

    if (typeof testModule.run !== 'function') {
      console.error(`Error: Module at ${modulePath} does not export a 'run' function.`);
      return false;
    }

    await testModule.run();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests completed for: ${moduleName}`);
    console.log(`${'='.repeat(50)}\n`);
    return true;
  } catch (err) {
    console.error(`\nError running tests for ${moduleName}:`, err.message || err);
    return false;
  }
}

async function main() {
  createRunnerInterface();

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     DoublePlay - Test Module Runner        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const modules = await discoverTestModules();

  if (modules.length === 0) {
    console.log('No test modules found.');
    console.log('Expected structure: test/{moduleName}/index.js with a run() function\n');
    closeRunnerInterface();
    return;
  }

  console.log(`Found ${modules.length} test module(s):\n`);

  while (true) {
    modules.forEach((mod, idx) => {
      console.log(`${idx + 1}) ${mod.displayName}`);
    });
    console.log(`${modules.length + 1}) Run all tests`);
    console.log('0) Exit\n');

    const choice = await ask('Select an option: ');
    const selected = parseInt(choice, 10);

    if (selected === 0) {
      console.log('\nExiting...');
      break;
    } else if (selected === modules.length + 1) {
      console.log('\n');
      closeRunnerInterface();
      for (const mod of modules) {
        const success = await runModule(mod.path, mod.displayName);
        if (!success) {
          console.log(`⚠️ Tests failed for ${mod.displayName}\n`);
        }
      }
      createRunnerInterface();
    } else if (selected > 0 && selected <= modules.length) {
      const mod = modules[selected - 1];

      closeRunnerInterface();
      await runModule(mod.path, mod.displayName);
      createRunnerInterface();
    } else {
      console.log('\nInvalid option, try again.\n');
    }

    console.log('');
  }

  closeRunnerInterface();
}

main();
