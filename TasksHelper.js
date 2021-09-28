/**
 * TaskHelper.js is a collection of helper methods that are used to read Pa11y Task files from JSON
 */

let fs = require('graceful-fs');
let path = require('path');
let html = require('pa11y-reporter-html');
const chalk = require("chalk");

let tasks = [];

/**
 * Given the provided filePath input from the CLI, this will retrieve the tasks to run Pa11y with. Writes the filepath
 * the task was found at to the task unless it already has one.
 * @param filePath
 * @returns Array of Pa11y task objects.
 */
let getTasks = (filePath) => {
    tasks = []; // reset tasks array
    // If filePath is a directory, process all files in the directory
    if ( fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory() ) {
        let files = this.getFilesRecursively(filePath, []);
        for (let x in files) {
            tasks = [...tasks, ...this.traverseFiles(files[x])];
        }
    } else if ( fs.existsSync(filePath) ) {
        // If filePath is a single file, ready that file.
        // This expects the single file to contain an array of either file paths to Task definitions
        // or an array of individual JSON task objects (aka: task suite)
        let tests = JSON.parse(fs.readFileSync(filePath));
        for (let i in tests) {
            let test = tests[i];
            if( typeof test === 'string' ) {
                tasks = [...tasks, ...this.traverseFiles(test)];
            } else if( typeof test ==='object' ) {
                test.filePath = test.filePath ? test.filePath : filePath;
                tasks.push(test);
            } else {
                throw new Error('The provided file is invalid. It does not contain a task(s) in valid JSON or a list of filepaths. Filepath: ' + filePath);
            }
        }
    } else {
        throw new Error('There was no directory or file found at ' + filePath);
    }

    return tasks;
}

/**
 * This method will traverse the given file path for individual JSON files.
 * @param filePath
 */
const traverseFiles = (filePath) => {
    let localTasks = [];
    if ( fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory() ) {
        let files = this.getFilesRecursively(filePath, []);
        for (let x in files) {
            if ( fs.existsSync( files[x] ) ) {
                let file = fs.readFileSync( files[x] );
                let suiteTasks = JSON.parse(file);
                for ( const x of suiteTasks) {
                    x.filePath = x.filePath ? x.filePath : filePath;
                    localTasks.push(x);
                }
            } else {
                throw new Error('There was no file found at ' + filePath);
            }
        }
    } else if ( fs.existsSync(filePath) ) {
        let file = fs.readFileSync(filePath);
        let suiteTasks = JSON.parse(file);
        for ( const x of suiteTasks) {
            x.filePath = x.filePath ? x.filePath : filePath;
            localTasks.push(x);
        }
    } else {
        throw new Error('There was no directory or file found at ' + filePath);
    }

    return localTasks;
}

/**
 * This method will take a directory and recursively return ALL file paths within the provided directory
 * @param directory to traverse
 * @param files the flat array of file paths being built by the recursive method
 * @returns {*}
 */
const getFilesRecursively = (directory, files) => {
    let localFiles = files;
    const filesInDirectory = fs.readdirSync(directory);
    for (const file of filesInDirectory) {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) {
            getFilesRecursively(absolute, localFiles);
        } else {
            localFiles.push(absolute);
        }
    }

    return localFiles;
};

/**
 * This method will take input as JSON scan results and output those results to an HTML file
 * @param jsonResults
 * @param task
 * @returns {Promise<*>}
 */
const generateHTMLResults = async (jsonResults, task) => {
    return await html.results(jsonResults)
        .then(htmlResults => {
            //add task name as header
            let html = htmlResults.replace(/h1/g, 'h2').split('<div class=\"page\">');
            let list = '<h4>Exceptions:</h4>\n<ul>\n';
            for (const index in task.ignore) {
                list += '\t\t<li style="margin-bottom:0px;">' + task.ignore[index] + '</li>\n';
            }
            if ( task.ignore == null || task.ignore.length === 0 ) {
                list += '\t\t<li style="margin-bottom:0px;">None</li>\n';
            }
            list += '</ul>';
            const exceptionsHtml = '\n\n\t\t' + '<div>\n\t\t\t' + list + '\n\t\t</div>\n\n\t\t';
            const h1 = '\n\n\t\t' + '<h1>' + task.name + '</h1>';
            let splitHtml = html[1].split('<p class="counts">');
            html = html[0] + '<div class=\"page\">' + h1 + splitHtml[0] + exceptionsHtml + '<p class="counts">' + splitHtml[1];
            //replace title of page with task name
            html = html.split('<title>');
            let htmlTop = html[0];
            let htmlBot = html[1].split('</title>')[1];
            const title = '<title> Accessibility Report for ' + task.name + '</title>';
            html = htmlTop + title + htmlBot;
            return html;
        })
        .catch((error) => {
            console.error( chalk.red(error.message) );
            return error.message
        });
};

/**
 * This method writes data to a given filepath. Will create directory if it doesn't exist
 * @param directory
 * @param filepath
 * @param data
 * @returns {*}
 */
const writeToFile = (directory, filePath, data) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
    }
    try{
        fs.writeFileSync(filePath, data);
        return filePath;
    } catch (error) {
        console.error( chalk.red(error.message) );
        return error.message;
    }
}

/**
 * Helper method to convert milliseconds to a more human readable format (hours, minutes, seconds)
 * @param duration
 * @returns {string}
 */
const msToTime = (duration) => {
    let milliseconds = Math.floor((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

/**
 * Waits the specified time before resolving promise.
 * @param duration
 * @returns {Promise<unknown>}
 */
const delay = async (duration) => {
    return new Promise(function(resolve) {
        setTimeout(resolve, duration);
    })
}

exports.getTasks = getTasks;
exports.getFilesRecursively = getFilesRecursively;
exports.traverseFiles = traverseFiles;
exports.generateHTMLResults = generateHTMLResults;
exports.writeToFile = writeToFile;
exports.msToTime = msToTime;
exports.delay = delay;