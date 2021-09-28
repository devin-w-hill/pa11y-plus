/**
 * Pa11y-CLI tool for running Pa11y ADA compliance scans via command line interface
 */


const chalk = require("chalk");
const {getTasks, delay, msToTime, writeToFile} = require('./TasksHelper.js');
const child_process = require('child_process');
const fs = require('graceful-fs');
const util = require('util');

const MAX_THREADS = 4;
const TIMEOUT = 300000; //milliseconds = 5 minutes

module.exports.Pa11yCli = class Pa11yCli {

    constructor()
    {
        this.yargs = require("yargs");
        this.threads = MAX_THREADS;
        this.writeToFile = writeToFile;
        this.msToTime = msToTime;
        this.getTasks = getTasks;
        this.delay = delay;
        this.childProcess = child_process;
        this.start = 0;
        this.tasks = [];
        this.finishedTasks = [];
        this.retryTasks = [];
        this.runningTasksCount = 0;
        this.taskPromises = [];
        this.failedScansCount = 0;
        this.retriesFailedCount = 0;

        /**
         * Primary run method for the CLI. Gets tasks to run, starts runner spawn process, waits for runners to finish
         * and outputs the results. Exits with 0 if scan was successful, 1 otherwise.
         * @returns {Promise<void>}
         */
        this.run = async () => {
            this.start = Date.now();
            if( this.file === null || typeof this.file === 'undefined') {
                this.yargs.showHelp("log");
                throw new Error('Invalid file input');
            }
            this.tasks = this.getTasks(this.file);
            if (this.tasks.length <= 0) {
                throw new Error("No tasks found.");
            }

            console.log(chalk.green("Running " + this.tasks.length + " Pa11y scans with a maximum of " + this.threads + " threads"));

            for (let task of this.tasks) {
                await this.execRunner(task);
            }

            if (this.retries) {
                await Promise.allSettled(this.taskPromises).then(async () => {
                    for (let task of this.finishedTasks) {
                        if (!task.success) {
                            console.log("Retrying task: " + task.name);
                            await this.execRunner(task, true);
                        }
                    }
                })
            }

            await Promise.allSettled(this.taskPromises).then(() => {
                this.logOverallResults();
                console.log("Total scan time: " + this.msToTime(Date.now() - this.start));
                if (this.retries && this.retriesFailedCount > 0) {
                    throw new Error("One or more scans failed.");
                }
                if (!this.retries && this.failedScansCount > 0) {
                    throw new Error("One or more scans failed.");
                }
            });
        }

        /**
         * Spawns a runner process to execute a single pa11y task. Creates new promise with each runner that resolves
         * when runner exits. Tracks number of concurrent runners to not exceed maximum.
         * @param task: task to spawn runner for
         * @param retry: flag set if task is a retry. Needed in childCallback.
         * @returns {Promise<void>}
         */
        this.execRunner = async (task, retry = false) => {
            if (!task) return;
            //wait for number running tasks to drop below maximum allowable
            while (this.runningTasksCount >= this.threads) {
                await delay(1000);
            }
            //pa11y usernames use a timestamp, force these to be unique with 1ms delay.
            await delay(1).then(() => {
                const filePath = this.prepareTask(task);
                const command = "npm run --silent runner " + filePath;
                const runner = new Promise((resolve) => {
                    this.runningTasksCount += 1;
                    let self = this;
                    this.childProcess.exec(command, {timeout: TIMEOUT}, (error, stdout) => {
                        self.runningTasksCount -= 1;
                        fs.unlinkSync(filePath);
                        self.childCallback(error, stdout, task, retry);
                        resolve();
                    });
                });
                this.taskPromises.push(runner);
            });
        }

        /**
         * Prepare task for execution in the runner. Write task to temp JSON file for a runner to retrieve.
         * @param task
         * @returns {*}
         */
        this.prepareTask = (task) => {
            task.debug = task.debug ? task.debug : this.debug;
            task.timeout = TIMEOUT;
            const directory = __dirname + '/temp/';
            const filePath = directory + task.name.replace(/ /g, '') + Date.now() + '.json';
            return this.writeToFile(directory, filePath, "[" + JSON.stringify(task) + "]");
        };


        /**
         * Does error handling and parses JSON from stdout of a runner process. Logs runner success or failure to console.
         * Pushes task to array based on if it's a retry or not.
         * @param error. The error that caused the runner process to exit
         * @param stdout: The string that the runner output to the console. Should contain the task contents.
         * @param task: the task passed to the runner originally in case the runner does not log task contents.
         * @param retry: flag to determine which array to push the task to.
         * @param stdout
         */
        this.childCallback = (error, stdout, task, retry) => {
            let returnedTask = null;
            if (error) {
                if (!error.code && error.signal == "SIGTERM") {
                    console.error("Runner timed out. Timeout (ms): " + TIMEOUT);
                    returnedTask = task;
                    returnedTask.error = "Task did not complete due to thread timeout. Timeout (ms): " + TIMEOUT;
                }
                else if (error.code === 2) {
                    console.error("Runner failed to initialize task: " + task.name);
                    returnedTask = task;
                    returnedTask.error = "Task did not complete because runner could not initialize task.";
                } else {
                    returnedTask = JSON.parse(stdout);
                    if (returnedTask.error) {console.error(returnedTask.error); }
                }
                returnedTask.success = false;
                if (retry) {
                    this.retryTasks.push(returnedTask);
                    console.log("FAILED: " + returnedTask.name + ' thread exited. Elapsed time: ' + this.msToTime(Date.now() - this.start) + "\n------");
                } else {
                    this.finishedTasks.push(returnedTask);
                    console.log("FAILED: " + returnedTask.name + ' thread exited. ' + (this.tasks.length - this.finishedTasks.length) + ' task(s) remaining. Elapsed time: ' + this.msToTime(Date.now() - this.start) + "\n------");
                }
            } else {
                returnedTask = JSON.parse(stdout);
                returnedTask.success = true;
                if (retry) {
                    this.retryTasks.push(returnedTask);
                    console.log("FINISHED: " + returnedTask.name + ' thread exited. Elapsed time: ' + this.msToTime(Date.now() - this.start) + "\n------");
                } else {
                    this.finishedTasks.push(returnedTask);
                    console.log("FINISHED: " + returnedTask.name + ' thread exited. ' + (this.tasks.length - this.finishedTasks.length) + ' task(s) remaining. Elapsed time: ' + this.msToTime(Date.now() - this.start) + "\n------");
                }
            }
        };


        /**
         * Outputs count of how many tasks passed and failed (including retries if any). Counts the number of failed scans
         * which includes any task with an error or ADA issue.
         * Sorts task arrays so tasks with an error or ADA issues are at the end of the array.
         */
        this.logOverallResults = () => {
            console.log(chalk.white(':::::::::::::::::::::::::::::::::::SCAN RESULTS:::::::::::::::::::::::::::::::::::'));
            this.finishedTasks.forEach((task) => { if (!task.success || task.resultsCount > 0) ++this.failedScansCount; });
            this.finishedTasks.sort((a, b) => (a.success < b.success || a.resultsCount > b.resultsCount) ? 1 : -1); //move failed tasks to end of array
            this.logTaskResults(this.finishedTasks, this.failedScansCount);

            console.log("---\nPASSED: " + (this.finishedTasks.length - this.failedScansCount) + " of " + this.finishedTasks.length);
            console.log("FAILED: " + this.failedScansCount + " of " + this.finishedTasks.length);
            if (this.retries && this.retryTasks.length > 0) {
                console.log(chalk.white('::::::::::::::::::::::::::::::::RETRY SCAN RESULTS::::::::::::::::::::::::::::::::'));
                this.retryTasks.forEach((task) => { if (!task.success || task.resultsCount > 0) ++this.retriesFailedCount; });
                this.retryTasks.sort((a, b) => (a.success < b.success) ? 1 : -1); //move failed tasks to end of array
                this.logTaskResults(this.retryTasks, this.retriesFailedCount);
                console.log(chalk.white('---\nRETRY SCAN RESULTS'));
                console.log("PASSED: " + (this.retryTasks.length - this.retriesFailedCount) + " of " + this.retryTasks.length);
                console.log("FAILED: " + this.retriesFailedCount + " of " + this.retryTasks.length);
            }
        }

        /**
         * Logs individual task results including any ADA compliance issues and errors that happened in the runner.
         * Scans with no errors or compliance issues just state their success.
         * @param tasks: the tasks to log to console.
         * @param totalFails: total number of failed tasks in the tasks array passed in.
         */
        this.logTaskResults = (tasks, totalFails) => {
            let failCount = 0;
            tasks.forEach((task) => {
                if (task.success && task.resultsCount === 0) {
                    console.log(chalk.white('SUCCESSFUL SCAN --- ' + task.name + " - " + task.url + ' --- TASK RUN TIME: ' + task.time));
                } else {
                    console.log(chalk.white('---------- FAILED SCAN ' + ++failCount + ' of ' + totalFails + ': ' + task.name + " - " + task.url + ' ----------'));
                    console.log('Task found at file path: ' + task.filePath);
                    //if (task.createUser) { console.log(task.createUser); }
                    if (task.loginCookie) {console.log('Cookie: ' + task.loginCookie);}
                    if (task.banResults) {console.log('Set BAN Response: ' + task.banResults);}
                    if (task.results) {
                        console.log(task.results);
                        if (task.resultsCount > 0) {
                            console.log(chalk.red.bold(task.resultsCount + ' ADA compliance issues found!'));
                        }
                    }
                    //if (task.deleteUser) { console.log(task.deleteUser); }
                    if (task.error) {
                        console.log(chalk.redBright(task.error));
                    }
                }
            });
        }


        /**
         * The end() method is used exit the running process with the given exit code.
         * When in debug mode, we do NOT exit the process and leave it open for debugging purposes.
         * @param exitCode
         * @param m
         */
        this.end = (exitCode, message) => {
            console.error(message);
            if ( exitCode === 1 ) {
                if ( this.debug === true ) {
                    console.log("Debug mode enabled...manually close process.")
                } else {
                    process.exit(1);
                }
            } else {
                if ( this.debug === true ) {
                    console.log("Debug mode enabled...manually close process.")
                } else {
                    process.exit(0);
                }
            }
        }

        /**
         * The setUp() method is used to configure the Yargs (CLI arguments)
         * This will parse the CLI arguments and set the object attributes accordingly.
         */
        this.setUp = async () => {
            let file, options;
            try {
                options = await this.yargs
                    .fail(false)
                    .demandCommand(1)
                    .usage("Usage: pa11y-cli <file>")
                    .usage('\n<file> A JSON file with an array of Pa11y task objects or file paths to Pa11y task objects.')
                    .option('d', {
                        alias: 'debug',
                        type: 'boolean',
                        demandOption: false,
                        description: 'Run in debug mode, headless: false'
                    })
                    .option('t', {
                        alias: 'threads',
                        type: 'number',
                        demandOption: false,
                        description: 'Max number of pa11y threads to use'
                    })
                    .option('r', {
                        alias: 'retries',
                        type: 'boolean',
                        demandOption: false,
                        description: 'Enable retries of failed tasks.'
                    })
                    .help('h')
                    .alias('h', 'help')
                    .version('v')
                    .alias('v', 'version')
                    .argv;
            } catch (e) {
                this.end(1, e.message);
                return;
            }

            this.file = (options._[0]);
            this.debug = (options.d) ? true : false;
            this.account = (options.a) ? options.a : null;
            this.threads = (options.t) ? options.t : MAX_THREADS;
            this.retries = (options.r) ? options.r : false;
        }
    }
}