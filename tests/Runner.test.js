const Runner = require("../Runner.js").Runner;

describe("Runner.js tests", () => {
    jest.setTimeout(30000);

    let mockTask = {};
    let mockConfig = {};
    let filepath = '/test/file/path/file.json';

    beforeEach(() => {
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
        };
        filepath = '/test/file/path/file.json';
        jest.resetModules();
        jest.resetAllMocks();
    });
    afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
    });

    test("prepareTask(), No task found at filepath", () => {
        let runner = new Runner();
        runner.getTasks = jest.fn().mockImplementationOnce(() => { throw new Error('No task found.') } );
        expect(() => { runner.prepareTask(filepath)} ).toThrow('No task found.');
    });

    test("prepareTask(), Task found at filepath", () => {
        let runner = new Runner();
        runner.getTasks = jest.fn().mockReturnValueOnce([{name: "a_task"}]);
        runner.prepareTask(filepath);
        expect(runner.task.name).toBe('a_task');
    });

    // test("scan() db connection error", async () => {
    //     let runner = new Runner();
    //     runner.task = {error: {}};
    //     runner.db.startConnection = jest.fn().mockImplementation(() => {
    //         throw new Error('mock DB connection error');
    //     });
    //     await expect(runner.scan()).rejects.toThrow('mock DB connection error');
    // });

    // test("scan() createPa11yUser error", async () => {
    //     let runner = new Runner();
    //     runner.task = {error: {}};
    //     runner.db.startConnection = jest.fn();
    //     runner.db.createPa11yUser = jest.fn().mockImplementation(() => {
    //         throw new Error('mock createPa11yUser error');
    //     });
    //     await expect(runner.scan()).rejects.toThrow('mock createPa11yUser error');
    // });

    test("scan() setUpTaskOptions error", async () => {
        let runner = new Runner();
        runner.task = {error: {}};
        runner.db.startConnection = jest.fn();
        runner.db.createPa11yUser = jest.fn();
        runner.setUpTaskOptions = jest.fn().mockImplementation(() => {
            throw new Error('mock setupTaskOptions error');
        });
        await expect(runner.scan()).rejects.toThrow('mock setupTaskOptions error');
    });

    test("scan() pa11y error", async () => {
        let runner = new Runner();
        runner.setUpTaskOptions = jest.fn().mockReturnValueOnce({
            browser: { close: jest.fn() },
            page: { screenshot: jest.fn() }
        });
        runner.pa11y = jest.fn().mockRejectedValueOnce(new Error('mock pa11y error'));
        runner.writeToFile = jest.fn().mockReturnValue('file/path/for/timeout/queries.txt');
        runner.db.startConnection = jest.fn();
        runner.db.createPa11yUser = jest.fn();
        runner.db.deletePa11yUser = jest.fn();
        runner.db.endConnection = jest.fn();
        runner.db.query = jest.fn().mockReturnValue(['a single row']);
        runner.task = mockTask;
        runner.task.debug = false;
        runner.task.actions = ["not a real action"];
        runner.task.error = {};
        await expect(runner.scan()).rejects.toThrow('mock pa11y error');
        expect(runner.task.resultsPath).toBe('file/path/for/timeout/queries.txt');
    });

    test("scan() pa11y error with debug", async () => {
        let runner = new Runner();
        runner.setUpTaskOptions = jest.fn().mockReturnValueOnce({
            browser: { close: jest.fn() },
            page: { screenshot: jest.fn() }
        });
        runner.pa11y = jest.fn().mockRejectedValueOnce(new Error('mock pa11y error'));
        runner.writeToFile = jest.fn().mockReturnValue('file/path/for/timeout/queries.txt');
        runner.db.startConnection = jest.fn();
        runner.db.createPa11yUser = jest.fn();
        runner.db.deletePa11yUser = jest.fn();
        runner.db.endConnection = jest.fn();
        runner.db.query = jest.fn().mockReturnValue([]);
        runner.task = mockTask;
        runner.task.debug = true;
        runner.task.actions = ["not a real action"];
        runner.task.error = {};
        await expect(runner.scan()).rejects.toThrow('mock pa11y error');
        expect(runner.task.resultsPath).toBe('file/path/for/timeout/queries.txt');
    });

    test("scan() pa11y runs no debug", async () => {
        let runner = new Runner();
        runner.setUpTaskOptions = jest.fn().mockReturnValueOnce({
            browser: { close: jest.fn() }
        });
        let results = {issues: [0,1]};
        runner.pa11y = jest.fn().mockResolvedValueOnce(results);
        runner.writeToFile = jest.fn().mockReturnValue('file/path/for/timeout/queries.txt');
        runner.db.startConnection = jest.fn();
        runner.db.createPa11yUser = jest.fn();
        runner.generateHTMLResults = jest.fn();
        runner.db.deletePa11yUser = jest.fn();
        runner.db.endConnection = jest.fn();
        runner.task = mockTask;
        runner.task.debug = false;
        runner.task.actions = ["not a real action"];
        runner.task.error = {};
        await runner.scan();
        expect(runner.task.results).toContain(JSON.stringify(results, null, 4));
        expect(runner.task.resultsPath).toBe('file/path/for/timeout/queries.txt');
        expect(runner.task.resultsCount).toBe(results.issues.length);
    });

    test("scan() pa11y runs with debug", async () => {
        let runner = new Runner();
        runner.setUpTaskOptions = jest.fn().mockReturnValueOnce({
            browser: { close: jest.fn() },
            page: { screenshot: jest.fn() }
        });
        let results = {issues: [0,1]};
        runner.pa11y = jest.fn().mockResolvedValueOnce(results);
        runner.writeToFile = jest.fn().mockReturnValue('file/path/for/timeout/queries.txt');
        runner.db.startConnection = jest.fn();
        runner.db.createPa11yUser = jest.fn();
        runner.generateHTMLResults = jest.fn();
        runner.db.deletePa11yUser = jest.fn();
        runner.db.endConnection = jest.fn();
        runner.task = mockTask;
        runner.task.debug = true;
        runner.task.actions = ["not a real action"];
        runner.task.error = {};
        await runner.scan();
        expect(runner.task.results).toContain(JSON.stringify(results, null, 4));
        expect(runner.task.resultsPath).toBe('file/path/for/timeout/queries.txt');
        expect(runner.task.resultsCount).toBe(results.issues.length);
    });

    // test("scan() pa11y runs and deletePa11yUser throws error", async () => {
    //     let runner = new Runner();
    //     runner.setUpTaskOptions = jest.fn().mockReturnValueOnce({
    //         browser: { close: jest.fn() }
    //     });
    //     let results = {issues: [0,1]};
    //     runner.pa11y = jest.fn().mockResolvedValueOnce(results);
    //     runner.writeToFile = jest.fn().mockReturnValue('file/path/for/timeout/queries.txt');
    //     runner.db.startConnection = jest.fn();
    //     runner.db.createPa11yUser = jest.fn();
    //     runner.generateHTMLResults = jest.fn();
    //     runner.db.deletePa11yUser = jest.fn().mockRejectedValueOnce(new Error('mock deletePa11yUser error'));
    //     runner.db.endConnection = jest.fn();
    //     runner.task = mockTask;
    //     runner.task.debug = true;
    //     runner.task.actions = ["not a real action"];
    //     runner.task.error = {};
    //     await expect(runner.scan()).rejects.toThrow('mock deletePa11yUser error');
    //     expect(runner.task.results).toContain(JSON.stringify(results, null, 4));
    //     expect(runner.task.resultsPath).toBe('file/path/for/timeout/queries.txt');
    //     expect(runner.task.resultsCount).toBe(results.issues.length);
    // });

    // test("scan() pa11y runs and endConnection throws error", async () => {
    //     let runner = new Runner();
    //     runner.setUpTaskOptions = jest.fn().mockReturnValueOnce({
    //         browser: { close: jest.fn() }
    //     });
    //     let results = {issues: [0,1]};
    //     runner.pa11y = jest.fn().mockResolvedValueOnce(results);
    //     runner.writeToFile = jest.fn().mockReturnValue('file/path/for/timeout/queries.txt');
    //     runner.db.startConnection = jest.fn();
    //     runner.db.createPa11yUser = jest.fn();
    //     runner.generateHTMLResults = jest.fn();
    //     runner.db.deletePa11yUser = jest.fn();
    //     runner.db.endConnection = jest.fn().mockRejectedValueOnce(new Error('mock endConnection error'));
    //     runner.task = mockTask;
    //     runner.task.debug = true;
    //     runner.task.actions = ["not a real action"];
    //     runner.task.error = {};
    //     await expect(runner.scan()).rejects.toThrow('mock endConnection error');
    //     expect(runner.task.results).toContain(JSON.stringify(results, null, 4));
    //     expect(runner.task.resultsPath).toBe('file/path/for/timeout/queries.txt');
    //     expect(runner.task.resultsCount).toBe(results.issues.length);
    // });

    test("setUpTaskOptions() puppeteer throws error", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.debug = false;
        let launch = runner.puppeteer.launch;
        runner.puppeteer.launch = jest.fn().mockRejectedValueOnce(new Error('mock puppeteer error'));
        await expect(runner.setUpTaskOptions()).rejects.toThrow('mock puppeteer error');
        runner.puppeteer.launch = launch;
    });

    test("setUpTaskOptions() getLoginCookie throws error", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.debug = false;
        runner.puppeteer.launch = jest.fn().mockResolvedValueOnce({
            newPage : jest.fn().mockResolvedValueOnce({
                setDefaultTimeout : jest.fn()
            })
        });
        runner.getLoginCookie = jest.fn().mockRejectedValueOnce(new Error('mock login error'))
        await expect(runner.setUpTaskOptions()).rejects.toThrow('mock login error');
    });

    test("setUpTaskOptions() returns options", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.debug = false;
        runner.puppeteer.launch = jest.fn().mockResolvedValueOnce({
            newPage : jest.fn().mockResolvedValueOnce({
                setDefaultTimeout : jest.fn(),
                setCookie: jest.fn()
            })
        });
        runner.getLoginCookie = jest.fn().mockReturnValueOnce('cookie');
        let options = await runner.setUpTaskOptions();
        expect(runner.task.loginCookie).toBe('cookie');
        expect(options.browser).toBeDefined();
    });

    test("setUpTaskOptions(), no autoLogin returns options", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.autoLogin = false;
        runner.task.debug = false;
        runner.puppeteer.launch = jest.fn().mockResolvedValueOnce({
            newPage : jest.fn().mockResolvedValueOnce({
                setDefaultTimeout : jest.fn()
            })
        });
        let options = await runner.setUpTaskOptions();
        expect(options.browser).toBeDefined();
    });

    test("getLoginCookie() with no email or password", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.error = {};
        await expect(runner.getLoginCookie()).rejects.toThrow('Email and password are required');
    });

    test("getLoginCookie() fetch throws error", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.email = 'test@inseego.com';
        runner.task.password = 'testpw';
        runner.task.error = {};
        runner.fetch = jest.fn().mockRejectedValueOnce(new Error('mock fetch error'));
        await expect(runner.getLoginCookie()).rejects.toThrow('mock fetch error');
    });

    test("getLoginCookie() gets cookie", async () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.email = 'test@inseego.com';
        runner.task.password = 'testpw';
        runner.task.error = {};
        runner.fetch = jest.fn().mockResolvedValueOnce({
            headers: { get: jest.fn().mockReturnValueOnce('loginCookie=testcookie') }
        });
        let cookie = await runner.getLoginCookie();
        expect(cookie).toBe('testcookie');
    });

    test("extractHostname() url has leading //", () => {
        let runner = new Runner();
        runner.task = mockTask;
        let hostname = runner.extractHostname(runner.task.url);
        expect(hostname).toBe('govdemo.staging.tmorders.dev');
    });

    test("extractHostname() url doesn't have leading //", () => {
        let runner = new Runner();
        runner.task = mockTask;
        runner.task.url = 'govdemo.staging.tmorders.dev/portal/help/index';
        let hostname = runner.extractHostname(runner.task.url);
        expect(hostname).toBe('govdemo.staging.tmorders.dev');
    });
});