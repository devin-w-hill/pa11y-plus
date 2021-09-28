# How to Use Pa11y 
Pa11y is your automated accessibility testing pal. It runs accessibility tests on your pages via the command line or Node.js, so you can automate your testing process.  
You can find the official documentation [here](https://github.com/pa11y/pa11y).  

## Requirements
Pa11y requires Node.js 8+ to run. You can download a pre-built package from the 
[Node.js website](https://nodejs.org/en/). 
Pa11y will be usable via the bundled Node.js application as well as the Windows command prompt.  
You will also need to run ``npm install`` inside this directory to install the necessary dependencies.

## Installation
1. Install Node.js if you have not already. See requirements above for link to Node.js website.
2. `cd <PROJECT_DIR>/pa11y`
3. `cp .env.example .env`
   - Replace values in the `.env` file accordingly.
4. `npm install`

## Pa11y Tasks
Pa11y scans webpages for ADA-compliance using what it calls "tasks". There are several parts to a task with the most important
ones listed below:

+ **url**: The URL specifies where pa11y will scan for compliance. When running tests locally, use the -a flag to substitute
  your own domain to test your changes.
+ **wait**: The wait field (don't confuse with the wait action) determines how long the actions will be delayed after the initial request to the URL
  has been made. It is specified in milliseconds (1 second = 1000 milliseconds). This can be useful if you need a page
  to load fully before you start doing actions on it.
+ **rootElement**: Specify an element on the page so pa11y only scans that element and its subtree.
+ **actions**:Actions allow you to interact with a page once it has loaded. The pa11y repo docs have a list of actions
  [here](https://github.com/pa11y/pa11y#actions). One that is missing from the list is the "wait x" action, where x is
  a number of milliseconds. This is useful when scanning URL's for single-page apps where waiting 
  for a specific element state/emit does not work well.
Example task:
```json
[
  {
    "name": "Test",
    "url": "https://example.com/index",
    "timeout": 30000,
    "wait": 0,
    "standard": "WCAG2AA",
    "ignore": [
      "WCAG2AA.Principle1.Guideline1_3.1_3_1.F68"
    ],
    "actions": [
      "wait for #element to be visible"
    ]
  }
]
```

## Writing Tasks

To write your own task, create a new .json file and place it appropriately in the tasks folder. 
All tasks follow the same formatting as the example above. They must use valid JSON and be in an array. A single .json file
can have as many tasks contained within it as desired.

## Command Line Options
You can use the command line to specify a directory or file with tasks that you'd like to run but you'll need to install
pa11y-cli first.
1. `cd <PROJECT_DIR>/pa11y`
2. `npm install -g`
3. `pa11y-cli ./path/to/task/file/or/directory`

Pa11y has some run options:
+ -d: Enable debug mode. When a task starts, a browser will open so you can watch any actions take place.
+ -t: Specify the maximum number of pa11y scans that can run concurrently. Default is 4. Mainly intended to be used in the pipeline.
+ -r: Enable retries. When a task fails, it will be re-attempted once. Mainly intended for use in the pipeline to resolve tasks failing randomly.


## Running Tasks

#### Examples of Running Tasks
There are several ways to run any task(s) so you can use pa11y how you'd like. You will need to be in the pa11y directory for each option.
1. `pa11y-cli ./tasks` Scan all tasks.
2. `pa11y-cli ./tasks/example.json` Scan the tasks found in a specific file.

### Debugging Tasks
While writing a task, you can use the -d flag to turn off headless mode and watch the actions as they take place in an
actual Chromium browser.
+ Run `pa11y-cli ./path/to/task/file/or/directory -d`.  
    + This is the same command as listed in the Command Line Options section above but the `-d` flag turns off headless mode.

### Task Scan Results
While pa11y is running, it will output the success of scans as their worker thread exits. `FINISHED` means the task successfully performed
a pa11y scan and no errors occurred. It does not mean that the pa11y scan found no ADA-compliance issues. `FAILED` means
some error occurred during execution and caused the thread to exit. A pa11y scan still might've taken place depending on
when the error took place. The full log of task results prints out after all tasks have completed.
```json
Running 2 Pa11y scans with a maximum of 4 threads
FINISHED: Example Homepage thread exited. 1 task(s) remaining. Elapsed time: 00:00:13.0
FAILED: Example Login thread exited. 0 task(s) remaining. Elapsed time: 00:00:26.0
------
```
Assuming pa11y completed a task and all of its actions without error, a failed scan indicates that the 
page present at the end of the task was not ADA-compliant or some error took place during execution.
Below is an example of a task that performed its scan successfully but failed because the resulting page had compliance
issues.

A successful result is a task that completes all actions without error and the scan of the resulting page lists `0 ADA
compliance issues found`.

#### Scan results
Scan results will display in the terminal or run window depending on how the tests were initiated. Results will also be
generated as HTML for better readability and organization. You can find these in the `results` directory.

#### Unit Tests

You can run the pa11y unit tests using `npm test`.