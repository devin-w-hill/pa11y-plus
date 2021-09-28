describe("Pa11y-CLI runner - Pa11yCli.js", () => {
    let fs = jest.mock('graceful-fs');
    fs.unlinkSync = jest.fn();
    const { Pa11yCli } = require('../Pa11yCli.js');
    jest.setTimeout(30000);

    let mockTask = {};

    let ogProcess = {};
    let exitSpy = null;
    let consoleLogSpy = null;
    let consoleErrorSpy = null;
    let exitMock = jest.fn();
    exitMock.mockReturnValue(() => {
        throw new Error('exit(1) error');
    });
    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        ogProcess = global.process;
        global.process.exit = exitMock;
        exitSpy = jest.spyOn(global.process, 'exit')
        consoleLogSpy = jest.spyOn(console, 'log');
        consoleErrorSpy = jest.spyOn(console, 'error');
        mockTask = {
            "name": "Help",
            "url": "https://govdemo.staging.tmorders.dev/portal/help/index",
            "timeout": 30000,
            "wait": 0,
            "autoLogin": true,
            "setBanInSession": true,
            "ban": 239129065,
            "standard": "WCAG2AA",
            "ignore": [],
            "actions": []
        }
    });

    afterEach(() => {
        delete require.cache[require.resolve('yargs')]
        delete require.cache[require.resolve('../Pa11yCli.js')]
        global.process = ogProcess;
        jest.resetModules();
        jest.resetAllMocks();
        exitSpy = null;
        consoleLogSpy = null;
        consoleErrorSpy = null;
    });

    test("run() with invalid file", async () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './invalidFilePath.json';
        await expect(pa11ycli.run()).rejects.toThrow('There was no directory or file found at ./invalidFilePath.json');
    });

    test("run() with null file", async () => {
        let pa11ycli = new Pa11yCli();
        await expect(pa11ycli.run()).rejects.toThrow('Invalid file input');
    });

    test("run() with zero tasks found", async () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './filePathNoTasks.json';
        pa11ycli.getTasks = jest.fn().mockImplementationOnce(() => { return []; })
        await expect(pa11ycli.run()).rejects.toThrow('No tasks found.');
    });

    test("run() with failed scan mocks", async () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './path/to/mock.json';
        pa11ycli.getTasks = jest.fn().mockReturnValueOnce([{}, {}, {}]);
        pa11ycli.execRunner = jest.fn().mockImplementationOnce();
        pa11ycli.failedScansCount = 2
        jest.spyOn(pa11ycli, 'logOverallResults').mockImplementation(() => {});
        await expect(pa11ycli.run()).rejects.toThrow('One or more scans failed');
    });

    test("run() passed task and no retries", async () => {
        const chalk = require('chalk');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const passedTask = [{ name: "retryTask", success: true }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './path/to/mock.json';
        pa11ycli.retries = false;
        pa11ycli.getTasks = jest.fn().mockImplementationOnce(() => { return passedTask; })
        pa11ycli.execRunner = jest.fn()
            .mockImplementationOnce(() => { pa11ycli.finishedTasks = passedTask;});
        pa11ycli.logTaskResults = jest.fn().mockImplementationOnce(() => {});
        pa11ycli.taskPromises = [ new Promise(resolve => { resolve(true); } )];
        jest.spyOn(pa11ycli, 'logOverallResults').mockImplementation(() => {});
        await pa11ycli.run();
        expect(consoleLogSpy).not.toBeCalledWith('Retrying task: ' + passedTask[0].name);
        expect(pa11ycli.tasks.length).toBe(1);
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.failedScansCount).toBe(0);
        expect(pa11ycli.retriesFailedCount).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("run() failed task and no retries", async () => {
        const chalk = require('chalk');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const failedTask = [{ name: "retryTask", success: false }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './path/to/mock.json';
        pa11ycli.retries = false;
        pa11ycli.getTasks = jest.fn().mockImplementationOnce(() => { return failedTask; })
        pa11ycli.execRunner = jest.fn()
            .mockImplementationOnce(() => { pa11ycli.finishedTasks = failedTask;});
        pa11ycli.logTaskResults = jest.fn().mockImplementationOnce(() => {});
        pa11ycli.taskPromises = [ new Promise(resolve => { resolve(true); } )];
        jest.spyOn(pa11ycli, 'logOverallResults').mockImplementation(() => {});
        pa11ycli.failedScansCount = 1;
        await expect(pa11ycli.run()).rejects.toThrow('One or more scans failed.');
        expect(consoleLogSpy).not.toBeCalledWith('Retrying task: ' + failedTask[0].name);
        expect(pa11ycli.tasks.length).toBe(1);
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.failedScansCount).toBe(1);
        expect(pa11ycli.retriesFailedCount).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("run() failed task and retry passes", async () => {
        const chalk = require('chalk');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const failedTask = [{ name: "retryTask", success: false }];
        const passedTask = [{ success: true }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './path/to/mock.json';
        pa11ycli.retries = true;
        pa11ycli.getTasks = jest.fn().mockImplementationOnce(() => { return failedTask; })
        pa11ycli.execRunner = jest.fn()
            .mockImplementationOnce(() => { pa11ycli.finishedTasks = failedTask;})
            .mockImplementationOnce(() => { pa11ycli.retryTasks = passedTask;});
        pa11ycli.logTaskResults = jest.fn().mockImplementationOnce(() => {});
        pa11ycli.taskPromises = [ new Promise(resolve => { resolve(true); } )];
        jest.spyOn(pa11ycli, 'logOverallResults').mockImplementation(() => {});
        pa11ycli.failedScansCount = 1;
        pa11ycli.retriesFailedCount = 0;
        await pa11ycli.run();
        expect(consoleLogSpy).toBeCalledWith('Retrying task: ' + failedTask[0].name);
        expect(pa11ycli.tasks.length).toBe(1);
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.failedScansCount).toBe(1);
        expect(pa11ycli.retriesFailedCount).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(1);
    });

    test("run() failed task and retry fails", async () => {
        const chalk = require('chalk');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const failedTask = [{ name: "retryTask", success: false }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './path/to/mock.json';
        pa11ycli.retries = true;
        pa11ycli.getTasks = jest.fn().mockImplementationOnce(() => { return failedTask; })
        pa11ycli.execRunner = jest.fn()
            .mockImplementationOnce(() => { pa11ycli.finishedTasks = failedTask;})
            .mockImplementationOnce(() => { pa11ycli.retryTasks = failedTask;});
        pa11ycli.logTaskResults = jest.fn().mockImplementationOnce(() => {});
        pa11ycli.taskPromises = [ new Promise(resolve => { resolve(true); } )];
        jest.spyOn(pa11ycli, 'logOverallResults').mockImplementation(() => {});
        pa11ycli.failedScansCount = 1;
        pa11ycli.retriesFailedCount = 1;
        await expect(pa11ycli.run()).rejects.toThrow('One or more scans failed.');
        expect(consoleLogSpy).toBeCalledWith('Retrying task: ' + failedTask[0].name);
        expect(pa11ycli.tasks.length).toBe(1);
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.failedScansCount).toBe(1);
        expect(pa11ycli.retriesFailedCount).toBe(1);
        expect(pa11ycli.retryTasks.length).toBe(1);
    });

    test("run() passed task and retries ignored", async () => {
        const chalk = require('chalk');
        const consoleLogSpy = jest.spyOn(console, 'log');
        const passedTask = [{ name: "passedTask", success: true }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.file = './path/to/mock.json';
        pa11ycli.retries = true;
        pa11ycli.getTasks = jest.fn().mockImplementationOnce(() => { return passedTask; })
        pa11ycli.execRunner = jest.fn()
            .mockImplementationOnce(() => { pa11ycli.finishedTasks = passedTask;})
        pa11ycli.logTaskResults = jest.fn().mockImplementationOnce(() => {});
        pa11ycli.taskPromises = [ new Promise(resolve => { resolve(true); } )];
        jest.spyOn(pa11ycli, 'logOverallResults').mockImplementation(() => {});
        pa11ycli.failedScansCount = 0;
        await pa11ycli.run();
        expect(consoleLogSpy).not.toBeCalledWith('Retrying task: ' + passedTask[0].name);
        expect(pa11ycli.tasks.length).toBe(1);
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.failedScansCount).toBe(0);
        expect(pa11ycli.retriesFailedCount).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("setUp() set file, no options", async () => {
        process.argv = [];
        process.argv[0] = 'node';
        process.argv[1] = '../Pa11yCli.js';
        process.argv[2] = 'mockTest.json';
        let pa11ycli = new Pa11yCli();
        await pa11ycli.setUp();
        expect(pa11ycli.file).toBe('mockTest.json');
    });

    test("setUp() with all options used", async () => {
        process.argv = [];
        process.argv[0] = 'node';
        process.argv[1] = '../Pa11yCli.js';
        process.argv[2] = 'mockTest.json';
        process.argv[3] = '-d';
        process.argv[4] = '-a';
        process.argv[5] = 'test';
        process.argv[6] = '-t';
        process.argv[7] = 15;
        process.argv[8] = '-r';
        let pa11ycli = new Pa11yCli();
        await pa11ycli.setUp();
        expect(pa11ycli.file).toBe('mockTest.json');
        expect(pa11ycli.debug).toBe(true);
        expect(pa11ycli.threads).toBe(15);
        expect(pa11ycli.account).toBe('test');
        expect(pa11ycli.retries).toBe(true);
    });

    test("setUp() mock yargs errors", async () => {
        process.argv = [];
        process.argv[0] = 'node';
        process.argv[1] = '../Pa11yCli.js';
        let pa11ycli = new Pa11yCli();
        await pa11ycli.setUp(pa11ycli);
        expect(exitSpy).toBeCalledWith(1);
        expect(consoleErrorSpy).toBeCalledWith('Not enough non-option arguments: got 0, need at least 1');
    });

    test("end() with exit code 1", () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.end(1, 'mockErrorMessage');
        expect(consoleErrorSpy).toBeCalledWith('mockErrorMessage');
        expect(exitSpy).toBeCalledWith(1);
    });

    test("end() with exit code 1 with debug", () => {
        const consoleLogSpy = jest.spyOn(console, 'log');
        let pa11ycli = new Pa11yCli();
        pa11ycli.debug = true;
        pa11ycli.end(1, 'mockErrorMessage');
        expect(consoleErrorSpy).toBeCalledWith('mockErrorMessage');
        expect(consoleLogSpy).toBeCalledWith("Debug mode enabled...manually close process.");
        expect(exitSpy).toBeCalledTimes(0);
    });

    test("end() with exit code 0", () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.end(0, 'mockErrorMessage');
        expect(consoleErrorSpy).toBeCalledWith('mockErrorMessage');
        expect(exitSpy).toBeCalledWith(0);
    });

    test("end() with exit code 0 with debug", () => {
        const consoleLogSpy = jest.spyOn(console, 'log');
        let pa11ycli = new Pa11yCli();
        pa11ycli.debug = true;
        pa11ycli.end(0, 'mockErrorMessage');
        expect(consoleErrorSpy).toBeCalledWith('mockErrorMessage');
        expect(consoleLogSpy).toBeCalledWith("Debug mode enabled...manually close process.");
        expect(exitSpy).toBeCalledTimes(0);
    });

    test("execRunner() with null task", async () => {
        const mockTask = [{ name: "retryTask", success: false }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.tasks = mockTask;
        await pa11ycli.execRunner(null);
        expect(pa11ycli.tasks[0].start).toBeUndefined();
    });

    test("execRunner() and exec runs", async () => {
        const mockTask = [{ name: "retryTask" }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.tasks = mockTask;
        pa11ycli.prepareTask = jest.fn().mockReturnValueOnce('temp/file/path/task.json');
        pa11ycli.childProcess.exec = jest.fn((command, options, callback) => {
            callback.apply(pa11ycli, [null, '']);
        });
        pa11ycli.childCallback = jest.fn().mockImplementationOnce(() => {});
        const callbackSpy = jest.spyOn(pa11ycli, 'childCallback');
        await pa11ycli.execRunner(mockTask);
        expect(callbackSpy).toBeCalledTimes(1);
        expect(pa11ycli.taskPromises.length).toBe(1);
    });

    test("execRunner() and wait for a task to finish before running exec", async () => {
        const mockTask = [{ name: "retryTask1" }];
        let pa11ycli = new Pa11yCli();
        pa11ycli.runningTasksCount = 1;
        pa11ycli.threads = 1;
        pa11ycli.tasks = mockTask;
        pa11ycli.prepareTask = jest.fn().mockReturnValueOnce('temp/file/path/task.json');
        pa11ycli.childProcess.exec = jest.fn((command, options, callback) => {
            callback.apply(pa11ycli, [null, '']);
        });
        pa11ycli.childCallback = jest.fn().mockImplementationOnce(() => {});
        const callbackSpy = jest.spyOn(pa11ycli, 'childCallback');
        setTimeout(() => { --pa11ycli.runningTasksCount }, 1000);
        await pa11ycli.execRunner(mockTask);
        expect(callbackSpy).toBeCalledTimes(1);
        expect(pa11ycli.taskPromises.length).toBe(1);
    });

    test("prepareTask() task properties debug and account are set", () => {
        const mockTask = { name: "retryTask", debug: true, account: 'test' };
        let pa11ycli = new Pa11yCli();
        pa11ycli.debug = false;
        pa11ycli.account = 'staging';
        pa11ycli.writeToFile = jest.fn().mockReturnValueOnce('temp/file/path/task.json');
        let filepath = pa11ycli.prepareTask(mockTask);
        expect(mockTask.debug).toBe(true);
        expect(mockTask.account).toBe('test');
        expect(filepath).toBe('temp/file/path/task.json');
    });

    test("prepareTask() task inherits properties from pa11ycli options", () => {
        const mockTask = { name: "retryTask"};
        let pa11ycli = new Pa11yCli();
        pa11ycli.debug = false;
        pa11ycli.writeToFile = jest.fn().mockReturnValueOnce('temp/file/path/task.json');
        let filepath = pa11ycli.prepareTask(mockTask);
        expect(mockTask.debug).toBe(false);
        expect(filepath).toBe('temp/file/path/task.json');
    });

    test("childCallback() no error thrown, not a retry", () => {
        const mockTask = { name: "retryTask", error: {}};
        let pa11ycli = new Pa11yCli();
        pa11ycli.childCallback(null, JSON.stringify(mockTask), mockTask, false);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FINISHED:") && expect.stringContaining(" task(s) remaining. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("childCallback() no error thrown, is a retry", async () => {
        const mockTask = { name: "retryTask", error: {}};
        let pa11ycli = new Pa11yCli();
        pa11ycli.childCallback(null, JSON.stringify(mockTask), mockTask, true);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FINISHED:") && expect.stringContaining(" thread exited. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(1);
    });

    test("childCallback() runner timeout, error.signal: SIGTERM", () => {
        const mockTask = { name: "retryTask", error: {}};
        let pa11ycli = new Pa11yCli();
        let error = { signal: "SIGTERM" };
        pa11ycli.childCallback(error, JSON.stringify(mockTask), mockTask, false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Runner timed out. Timeout (ms): "));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FAILED:") && expect.stringContaining(" task(s) remaining. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("childCallback() runner failed to initialize, error.code: 2", () => {
        const mockTask = { name: "retryTask", error: {}};
        let pa11ycli = new Pa11yCli();
        let error = { code: 2 };
        pa11ycli.childCallback(error, JSON.stringify(mockTask), mockTask, false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Runner failed to initialize task: "));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FAILED:") && expect.stringContaining(" task(s) remaining. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("childCallback() runner failed during scan, error.code: 1, not a retry", () => {
        const mockTask = { name: "retryTask", error: {}};
        let pa11ycli = new Pa11yCli();
        let error = { code: 1 };
        pa11ycli.childCallback(error, JSON.stringify(mockTask), mockTask, false);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FAILED:") && expect.stringContaining(" task(s) remaining. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(1);
        expect(pa11ycli.retryTasks.length).toBe(0);
    });

    test("childCallback() runner failed during scan, error.code: 1, is a retry", () => {
        let mockTask = { name: "retryTask", error: {}};
        let pa11ycli = new Pa11yCli();
        let error = { code: 1 };
        pa11ycli.childCallback(error, JSON.stringify(mockTask), mockTask, true);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FAILED:") && expect.stringContaining(" thread exited. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(1);
        mockTask = { name: "retryTask"};
        pa11ycli.childCallback(error, JSON.stringify(mockTask), mockTask, true);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("FAILED:") && expect.stringContaining(" thread exited. Elapsed time: "));
        expect(pa11ycli.finishedTasks.length).toBe(0);
        expect(pa11ycli.retryTasks.length).toBe(2);
    });

    test("logOverallResults() with no retries", () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.finishedTasks = [{success: true},{ success:false },{ success:true }];
        pa11ycli.retries = false;
        pa11ycli.logTaskResults = jest.fn();
        pa11ycli.logOverallResults();
        expect(consoleLogSpy).toBeCalledTimes(3);
        expect(pa11ycli.failedScansCount).toBe(1);
    });

    test("logOverallResults() with retries", () => {
        let pa11ycli = new Pa11yCli();
        pa11ycli.retries = true;
        pa11ycli.retryTasks = [{success: true},{success: false }, {success: true}];
        pa11ycli.logTaskResults = jest.fn();
        pa11ycli.logOverallResults();
        expect(consoleLogSpy).toBeCalledTimes(7);
        expect(pa11ycli.retriesFailedCount).toBe(1);
    });

    test("logTaskResults() with passed task", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = true;
        mockTask.resultsCount = 0;
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 0);
        expect(consoleLogSpy).toBeCalledTimes(1);
    });

    test("logTaskResults() with failed task, runner timeout/didn't initialize", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.error = 'Runner timeout';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(3);
    });

    test("logTaskResults() with failed task, could not login", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.error = 'Login failed';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(3);
    });

    test("logTaskResults() with failed task, could not set BAN", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.loginCookie = 'cookie value';
        mockTask.error = 'Ban not set';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(4);
    });

    test("logTaskResults() with failed task, pa11y error", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.loginCookie = 'cookie value';
        mockTask.banResults = 'ban response';
        mockTask.error = 'pa11y error';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(5);
    });

    test("logTaskResults() with failed task, could not delete user", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.loginCookie = 'cookie value';
        mockTask.banResults = 'ban response';
        mockTask.results = 'pa11y results';
        mockTask.resultsCount = 1;
        mockTask.error = 'could not delete user';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(7);
    });

    test("logTaskResults() with passed task, could not delete user", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.loginCookie = 'cookie value';
        mockTask.banResults = 'ban response';
        mockTask.results = 'pa11y results';
        mockTask.resultsCount = 0;
        mockTask.error = 'could not delete user';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(6);
    });

    test("logTaskResults() with failed task, unknown error", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.loginCookie = 'cookie value';
        mockTask.banResults = 'ban response';
        mockTask.results = 'pa11y results';
        mockTask.resultsCount = 1;
        mockTask.deleteUser = 'user xyz123@inseego.com deleted';
        mockTask.error = 'unexpected error from runner';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(7);
    });

    test("logTaskResults() with failed task, no error found", () => {
        let pa11ycli = new Pa11yCli();
        mockTask.success = false;
        mockTask.createUser = 'user xyz123@inseego.com created';
        mockTask.loginCookie = 'cookie value';
        mockTask.banResults = 'ban response';
        mockTask.results = 'pa11y results';
        mockTask.resultsCount = 1;
        mockTask.deleteUser = 'user xyz123@inseego.com deleted';
        pa11ycli.tasks = [mockTask];
        pa11ycli.logTaskResults(pa11ycli.tasks, 1);
        expect(consoleLogSpy).toBeCalledTimes(6);
    });

});