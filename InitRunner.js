/**
 * Entrypoint for Runner.js.
 */

const Runner = require('./Runner.js').Runner;

const taskPath = process.argv[2];
let runner = null;
let scanError = null;
try {
    runner = new Runner();
    runner.prepareTask(taskPath);
} catch (error) {
    process.exit(2);
}
runner.scan()
.catch((error) => {
    scanError = error;
})
.finally(async () => {
    console.log(JSON.stringify(runner.task));
    if (runner.task.debug) {
        runner.options.browser.pages()[0].on('close', () => {
            if (scanError) {
                process.exit(1);
            } else {
                process.exit(0);
            }
        });
        await runner.options.browser.pages()[0].waitForTimeout(9999999);
    }
    if (scanError) {
        process.exit(1);
    } else {
        process.exit(0);
    }
})

