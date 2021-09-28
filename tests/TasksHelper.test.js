let tasksMod = require('../TasksHelper.js');
let fs = require('graceful-fs');

describe('TasksHelper module tests', () => {
    jest.setTimeout(30000);

    let mockPa11yResult = {
        "documentTitle": "Help - Help - Govdemo",
        "pageUrl": "https://govdemo.staging.tmorders.dev/portal/help/index",
        "issues": [
            {
                "code": "WCAG2AA.Principle2.Guideline2_4.2_4_1.H64.1",
                "type": "error",
                "typeCode": 1,
                "message": "Iframe element requires a non-empty title attribute that identifies the frame.",
                "context": "<iframe style=\"position: absolute; top: 0; left: 0; width: 100%; height: 100%;\" src=\"https://player.vimeo.com/video/398847860?color=ffffff&amp;byline=0&amp;portrait=0\" frameborder=\"0\" allowfullscreen=\"\"></iframe>",
                "selector": "#orderModal > div > div > div > iframe",
                "runner": "htmlcs",
                "runnerExtras": {}
            }
        ]
    }

    beforeEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
    });
    afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        fs = require('graceful-fs');
        tasksMod = require('../TasksHelper.js');
    });

    test('getTasks with invalid file path', () => {
        let filePath = './test/path/to/file.json';
        expect(() => {
            let tasks = tasksMod.getTasks(filePath);
        }).toThrowError('There was no directory or file found at ' + filePath);
    });

    test('getTasks -> directory path -> 0 tasks', () => {
        let filePath = './test/path/';
        let mockFn = jest.fn();
        mockFn.mockReturnValue(true);
        let mockLstat = jest.fn();
        let isDirectory = jest.fn();
        isDirectory.mockReturnValue(true);
        mockLstat.mockReturnValue({
            isDirectory: isDirectory
        });
        fs.existsSync = mockFn;
        fs.lstatSync = mockLstat;
        let mockGetFilesRecursively = jest.fn();
        mockGetFilesRecursively.mockReturnValue([]); // 0 task file paths.
        tasksMod.getFilesRecursively = mockGetFilesRecursively;

        let tasks = tasksMod.getTasks(filePath);
        expect(tasks.length).toBe(0);
    });

    test('getTasks -> directory path -> 2 files with 4 tasks', () => {
        let filePath = './test/path/to/file.json';
        let mockFn = jest.fn();
        mockFn.mockReturnValue(true);
        let mockLstat = jest.fn();
        let isDirectory = jest.fn();
        isDirectory.mockReturnValue(true);
        mockLstat.mockReturnValue({
            isDirectory: isDirectory
        });
        fs.existsSync = mockFn;
        fs.lstatSync = mockLstat;
        let mockGetFilesRecursively = jest.fn();
        mockGetFilesRecursively.mockReturnValueOnce([
            'test/file/path1.json',
            'test/file/path2.json'
        ]); // 0 task file paths.
        tasksMod.getFilesRecursively = mockGetFilesRecursively;
        let mockTraverseFiles = jest.fn();
        mockTraverseFiles.mockReturnValue(['mockTaskObj', 'mockTaskObj2']);
        tasksMod.traverseFiles = mockTraverseFiles;

        let tasks = tasksMod.getTasks(filePath);
        expect(tasks.length).toBe(4); // 4 because there are two file paths, which calls traverseFiles twice.
    });

    test('getTasks -> single file path -> with 1 task object', () => {
        let filePath = './test/path/to/file.json';
        let mockFn = jest.fn();
        mockFn.mockReturnValueOnce(false)
              .mockReturnValueOnce(true);
        fs.existsSync = mockFn;
        let mockReadFileSync = jest.fn();
        mockReadFileSync.mockReturnValueOnce(JSON.stringify([{name: "mockTask"}, {filePath :'notNull'}]));
        fs.readFileSync = mockReadFileSync;

        let tasks = tasksMod.getTasks(filePath);
        expect(tasks.length).toBe(2);
    });

    test('getTasks -> single file path -> with 2 file paths and 4 tasks', () => {
        let filePath = './test/path/to/file.json';
        let mockFn = jest.fn();
        mockFn.mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        fs.existsSync = mockFn;
        let mockReadFileSync = jest.fn();
        mockReadFileSync.mockReturnValueOnce(JSON.stringify([
            'test/file/path1.json',
            'test/file/path2.json'
        ]));
        fs.readFileSync = mockReadFileSync;
        let mockTraverseFiles = jest.fn();
        mockTraverseFiles.mockReturnValue(['mockTaskObj', 'mockTaskObj2']);
        tasksMod.traverseFiles = mockTraverseFiles;

        let tasks = tasksMod.getTasks(filePath);
        expect(tasks.length).toBe(4); // 4 because there are two file paths, which calls traverseFiles twice.
    });

    test('getTasks -> single file path -> with invalid task file', () => {
        let filePath = './test/path/to/file.json';
        let mockFn = jest.fn();
        mockFn.mockReturnValueOnce(false)
            .mockReturnValueOnce(true);
        fs.existsSync = mockFn;
        let mockReadFileSync = jest.fn();
        mockReadFileSync.mockReturnValueOnce(JSON.stringify([0, 1]));
        fs.readFileSync = mockReadFileSync;

        expect(() => {
            let tasks = tasksMod.getTasks(filePath);
        }).toThrowError('The provided file is invalid. It does not contain a task(s) in valid JSON or a list of filepaths. Filepath: ' + filePath);
    });

    test('getFilesRecursively with single directory depth', () => {
        let mockDirectory = 'test/directory/';
        let mockReaddirSync = jest.fn();
        mockReaddirSync.mockReturnValueOnce([
            'path1.json',
            'path2.json'
        ]);
        fs.readdirSync = mockReaddirSync;
        let mockStatSync = jest.fn();
        let mockIsDirectory = jest.fn();
        mockIsDirectory.mockReturnValueOnce(false);
        mockStatSync.mockReturnValue({
            isDirectory: mockIsDirectory
        });
        fs.statSync = mockStatSync;

        let files = tasksMod.getFilesRecursively(mockDirectory, []);
        expect(files.length).toBe(2);
    });

    test('getFilesRecursively with multiple sub-directories', () => {
        let mockDirectory = 'test/directory/';
        let mockReaddirSync = jest.fn();
        mockReaddirSync.mockReturnValueOnce([
            'path1.json',
            'path2.json',
            'sub/directory/',
            'sub/directory/'
        ]);
        mockReaddirSync.mockReturnValueOnce([
            'path3.json',
            'path4.json'
        ]);
        mockReaddirSync.mockReturnValueOnce([
            'path5.json',
            'path6.json'
        ])
        fs.readdirSync = mockReaddirSync;
        let mockStatSync = jest.fn();
        let mockIsDirectory = jest.fn();
        mockIsDirectory.mockReturnValueOnce(false);
        mockIsDirectory.mockReturnValueOnce(false);
        mockIsDirectory.mockReturnValueOnce(true);
        mockIsDirectory.mockReturnValueOnce(false);
        mockIsDirectory.mockReturnValueOnce(false);
        mockIsDirectory.mockReturnValueOnce(true);
        mockIsDirectory.mockReturnValueOnce(false);
        mockIsDirectory.mockReturnValueOnce(false);
        mockStatSync.mockReturnValue({
            isDirectory: mockIsDirectory
        });
        fs.statSync = mockStatSync;

        let files = tasksMod.getFilesRecursively(mockDirectory, []);
        expect(files.length).toBe(6);
    });

    test('traverseFiles -> directory path -> 0 tasks', () => {
        let filePath = './test/path/';
        let mockExistsSync = jest.fn();
        mockExistsSync.mockReturnValueOnce(true);
        let mockLstat = jest.fn();
        let isDirectory = jest.fn();
        isDirectory.mockReturnValueOnce(true);
        mockLstat.mockReturnValueOnce({
            isDirectory: isDirectory
        });
        fs.existsSync = mockExistsSync;
        fs.lstatSync = mockLstat;
        let mockGetFilesRecursively = jest.fn();
        mockGetFilesRecursively.mockReturnValueOnce([]); // 0 task file paths.
        tasksMod.getFilesRecursively = mockGetFilesRecursively;

        let tasks = tasksMod.traverseFiles(filePath);
        expect(tasks.length).toBe(0);
    });

    test('traverseFiles -> directory path -> 2 tasks', () => {
        let filePath = './test/path/';
        let mockExistsSync = jest.fn();
        mockExistsSync.mockReturnValueOnce(true);
        mockExistsSync.mockReturnValueOnce(true);
        mockExistsSync.mockReturnValueOnce(true);
        let mockLstat = jest.fn();
        let isDirectory = jest.fn();
        isDirectory.mockReturnValue(true);
        mockLstat.mockReturnValue({
            isDirectory: isDirectory
        });
        fs.existsSync = mockExistsSync;
        fs.lstatSync = mockLstat;
        let mockGetFilesRecursively = jest.fn();
        mockGetFilesRecursively.mockReturnValueOnce([
            'file1.json',
            'file2.json'
        ]);
        tasksMod.getFilesRecursively = mockGetFilesRecursively;
        let mockReadFileSync = jest.fn();
        mockReadFileSync.mockReturnValue(JSON.stringify(['mockTaskObject', {filePath: 'notNull'}]));
        fs.readFileSync = mockReadFileSync;

        let tasks = tasksMod.traverseFiles(filePath);
        expect(tasks.length).toBe(4);
    });

    test('traverseFiles -> single file path -> 2 tasks', () => {
        let filePath = './test/path/to/file.json';
        let mockExistsSync = jest.fn();
        mockExistsSync.mockReturnValueOnce(false);
        mockExistsSync.mockReturnValueOnce(true);
        fs.existsSync = mockExistsSync;
        let mockReadFileSync = jest.fn();
        mockReadFileSync.mockReturnValue(JSON.stringify(['mockTaskObject', {filePath: 'notNull' }]));
        fs.readFileSync = mockReadFileSync;

        let tasks = tasksMod.traverseFiles(filePath);
        expect(tasks.length).toBe(2);
    });

    test('traverseFiles -> invalid file path', () => {
        let filePath = './test/path/to/file.json';
        let mockExistsSync = jest.fn();
        mockExistsSync.mockReturnValueOnce(false);
        mockExistsSync.mockReturnValueOnce(false);
        fs.existsSync = mockExistsSync;


        expect(() => {
            let tasks = tasksMod.traverseFiles(filePath);
        }).toThrowError('There was no directory or file found at ' + filePath);
    });

    test('traverseFiles -> invalid file path within a directory', () => {
        let filePath = './test/path/';
        let mockExistsSync = jest.fn();
        mockExistsSync.mockReturnValueOnce(true);
        mockExistsSync.mockReturnValueOnce(false);
        fs.existsSync = mockExistsSync;
        let mockLstat = jest.fn();
        let isDirectory = jest.fn();
        isDirectory.mockReturnValue(true);
        mockLstat.mockReturnValue({
            isDirectory: isDirectory
        });
        fs.lstatSync = mockLstat;
        let mockGetFilesRecursively = jest.fn();
        mockGetFilesRecursively.mockReturnValueOnce([
            'file1.json'
        ]);
        tasksMod.getFilesRecursively = mockGetFilesRecursively;

        expect(() => {
            let tasks = tasksMod.traverseFiles(filePath);
        }).toThrowError('There was no file found at ' + filePath);
    });

    test("generateHTMLResults success with ignore exceptions", async () => {
        let mockHTML = {
            results: jest.fn().mockResolvedValue(mockPa11yResult)
        };
        tasksMod.html = mockHTML;
        Date.prototype.toString = jest.fn().mockReturnValue("Thu Jun 10 2021 18:46:30 GMT+0000 (Coordinated Universal Time)");

        let mockTask = {
            name: 'Test task',
            ignore: [
                "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37",
                "WCAG2AA.Principle1.Guideline1_3.1_3_1.H49.AlignAttr",
                "WCAG2AA.Principle1.Guideline1_3.1_3_1.H43.IncorrectAttr",
                "WCAG2AA.Principle1.Guideline1_3.1_3_1.H43.MissingHeaderIds",
                "WCAG2AA.Principle1.Guideline1_3.1_3_1.H43.MissingHeadersAttrs",
                "WCAG2AA.Principle1.Guideline1_3.1_3_1.F92,ARIA4"
            ]
        };
        let html = await tasksMod.generateHTMLResults(mockPa11yResult, mockTask);
        expect(html).toMatchSnapshot();
    });

    test("generateHTMLResults success without ignore exceptions", async () => {
        let mockHTML = {
            results: jest.fn().mockResolvedValue(mockPa11yResult)
        };
        tasksMod.html = mockHTML;
        Date.prototype.toString = jest.fn().mockReturnValue("Thu Jun 10 2021 18:46:30 GMT+0000 (Coordinated Universal Time)");

        let mockTask = {
            name: 'Test task',
            ignore: []
        };
        let html = await tasksMod.generateHTMLResults(mockPa11yResult, mockTask);
        expect(html).toMatchSnapshot();
    });

    test("writeToFile success", async () => {
        fs.existsSync = jest.fn();
        fs.existsSync.mockReturnValue(false);
        let mockMakeDirSync = jest.fn();
        mockMakeDirSync.mockReturnValue(null);
        fs.mkdirSync = mockMakeDirSync;
        const spyMakeDirSync = jest
            .spyOn(fs, 'mkdirSync');
        let mockWriteFileSync = jest.fn();
        mockWriteFileSync.mockReturnValue(null);
        fs.writeFileSync = mockWriteFileSync;
        const spyWriteFileSync = jest
            .spyOn(fs, 'writeFileSync');
        const html = '<html>testData</html>';
        const directory = 'test/directory/path/';
        const filepath = directory + 'test.html';
        let htmlFilepath = await tasksMod.writeToFile(directory, filepath, html);
        expect(spyMakeDirSync).toHaveBeenCalledTimes(1);
        expect(spyWriteFileSync).toHaveBeenCalledTimes(1);
        expect(htmlFilepath).toContain('test/directory/path/test.html');
        spyMakeDirSync.mockRestore();
        spyWriteFileSync.mockRestore();
    });

    test("writeFileSync fail", async () => {
        const chalk = require ('chalk');
        fs.existsSync = jest.fn();
        fs.existsSync.mockReturnValue(true);
        let mockWriteFileSync = jest.fn();
        mockWriteFileSync.mockImplementation( () => {
            throw new Error('mockError');
        });
        fs.writeFileSync = mockWriteFileSync;
        const spyWriteFileSync = jest
            .spyOn(fs, 'writeFileSync');
        const spyConsoleError = spyOn(console, 'error');
        const html = '<html>testData</html>';
        const directory = 'test/directory/path/';
        const filepath = directory + 'test.html';
        let htmlFilepath = await tasksMod.writeToFile(directory, filepath, html);
        expect(htmlFilepath).toBe('mockError');
        expect(spyConsoleError).toHaveBeenCalledWith(chalk.red('mockError'));
        expect(spyWriteFileSync).toHaveBeenCalledTimes(1);
        spyWriteFileSync.mockRestore();
    });

    test("generateHTMLResults html.results fail", async () => {
        const chalk = require('chalk');
        const spyConsoleError = spyOn(console, 'error');
        await tasksMod.generateHTMLResults(null, 'task');
        expect(spyConsoleError).toHaveBeenCalledWith(chalk.red('Cannot read property \'documentTitle\' of null'));
    });

    test("msToTime", () => {
        let duration = 1800000;
        let timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('00:30:00.0');

        duration = 100;
        timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('00:00:00.1');

        duration = 3000;
        timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('00:00:03.0');

        duration = 30000;
        timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('00:00:30.0');

        duration = 300000;
        timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('00:05:00.0');

        duration = 3600000;
        timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('01:00:00.0');

        duration = 39600000;
        timeStr = tasksMod.msToTime(duration);
        expect(timeStr).toBe('11:00:00.0');
    });

    test("delay", async () => {
        let duration = 1000;
        let promise = tasksMod.delay(duration);
        setTimeout(() => {}, duration);
        expect(promise).resolves.toBe(expect.anything());

    })
});
;