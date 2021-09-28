/**
 * Runner.js is a wrapper for the Pa11y JS library to run ADA compliance scans
 */

const https = require('https');
const puppeteer = require('puppeteer');
const {Headers} = require("node-fetch");
const {getTasks, generateHTMLResults, writeToFile, msToTime} = require('./TasksHelper.js');
const DbConnection = require('./DbConnection.js').DbConnection;
require('dotenv').config();


module.exports.Runner = class Runner {

    constructor() {
        this.getTasks = getTasks;
        this.fetch = require('node-fetch');
        this.puppeteer = puppeteer;
        this.pa11y = require('pa11y');
        this.generateHTMLResults = generateHTMLResults;
        this.writeToFile = writeToFile;
        this.db = new DbConnection();
        this.msToTime = msToTime;
        this.options = null;
        this.loginURL = null;

        this.prepareTask = (taskPath) => {
            this.task = this.getTasks(taskPath)[0];
        }

        /**
         * Executes pa11y setup and scan. Throws error when user can't be created/delete in db or if scan cannot complete
         * @returns {Promise<void>}
         */
        this.scan = async () => {
            const start = Date.now();
            // Create a new super user for each task.
            // try {
            //     await this.db.startConnection();
            // } catch (error) {
            //     this.task.error = "Pa11y could not establish a database connection. Is your database configured correctly? \n" + error;
            //     throw error;
            // }
            // this.task.email = "worker_" + Date.now() + '@test.com';
            // this.task.password = "testing";
            // try {
            //     this.task.customer_id = await this.db.createPa11yUser(this.task.email);
            //     this.task.createUser = "User " + this.task.email + " added successfully";
            // } catch (error) {
            //     this.task.error = "Pa11y was unable to create user: " + this.task.email + ". Is your database configured correctly? \n" + error;
            //     throw error;
            // }

            try {
                this.options = await this.setUpTaskOptions();
            } catch (e) {
                throw e;
            }
            let filePath = this.task.name;
            let directory = __dirname + '/results/';

            // Run the task with Pa11y
            await this.pa11y(this.task.url, this.options)
                .then(async (results) => {
                    if (this.task.debug === false) {
                        await this.options.browser.close();
                    }
                    const html = await this.generateHTMLResults(results, this.task);
                    filePath += '.html';
                    filePath = directory + filePath;
                    this.task.results = JSON.stringify(results, null, 4);
                    this.task.resultsCount = results.issues.length;
                    this.task.resultsPath = this.writeToFile(directory, filePath, html);
                })
                .catch(async (error) => {
                    filePath += '.png';
                    filePath = directory + filePath;
                    const screenshot = await this.options.page.screenshot({fullPage: true});
                    this.task.resultsPath = this.writeToFile(directory, filePath, screenshot);
                    if (this.task.debug === false) {
                        await this.options.browser.close();
                    }
                    this.task.error = "An error occurred during the pa11y scan. \n" + error;
                    throw error;
                })
                .finally(async () => {
                    // Remove Pa11y user from database
                    // try {
                    //     await this.db.deletePa11yUser(this.task.email, this.task.customer_id);
                    //     this.task.deleteUser = "User " + this.task.email + " deleted successfully";
                    // } catch (error) {
                    //     this.task.error = "Pa11y was unable to delete the user: " + this.task.email + ". Is your database configured correctly? \n" + error;
                    //     throw error;
                    // }
                    // try {
                    //     await this.db.endConnection();
                    // } catch (error) {
                    //     this.task.error = "Pa11y could not end the database connection. Is your database configured correctly? \n" + error;
                    //     throw error;
                    // }
                    this.task.time = this.msToTime(Date.now() - start)
                });
        }


        /**
         * This method will set up the runner options for Pa11y, including puppeteer as well as other custom functionality, like auto-login.
         * @returns {Promise<* & {browser: Browser, page: Page}>}
         */
        this.setUpTaskOptions = async () => {
            const browser = await this.puppeteer.launch({
                headless: !this.task.debug,
                product: 'chrome',
                ignoreHTTPSErrors: true,
                defaultViewport: {
                    width: 1024,
                    height: 768
                },
                args: [
                    "--no-sandbox",
                    "--ignore-certificate-errors",
                    "--disable-web-security"
                ]
            });
            let page = await browser.newPage();
            page.setDefaultTimeout(this.task.timeout);
            if (this.task.autoLogin === true) {
                this.loginURL = process.env.LOGIN_URL;
                this.task.loginCookie = await this.getLoginCookie();
                let domain = await this.extractHostname(this.task.url);
                await page.setCookie({
                    name: "loginCookie",
                    domain: domain,
                    path: "/",
                    value: this.task.loginCookie,
                    expirationDate: "Session",
                    hostOnly: false,
                    httpOnly: true,
                    secure: false,
                    session: false,
                    sameSite: "no_restriction",
                });
            }

            const options = Object.assign({}, {
                browser: browser,
                page,
                //includeWarnings: true,
                //includeNotices: true,
                ...this.task
            });

            return options;
        }


        /**
         * Custom fetch request to get a authentication login cookie
         * @returns {Promise<T|void>}
         */
        this.getLoginCookie = async () => {
            if (this.task.email == null || this.task.password == null) {
                this.task.error = "No email and/or password provided for autoLogin"
                throw new Error('Email and password are required');
            }
            let hostName = this.extractHostname(this.task.url);
            let httpsAgent = new https.Agent({
                rejectUnauthorized: false
            });
            // Each time we run a task, update it with a new cookie
            return await this.fetch('https://' + this.loginURL + '?email=' + this.task.email + '&password=' + this.task.password, {
                method: 'POST', // *GET, POST, PUT, DELETE, etc.
                redirect: 'manual',
                agent: httpsAgent
            })
            .then(response => {
                const cookies = response.headers.get('Set-Cookie');
                return cookies.split('loginCookie=').pop().split(';').shift();
            })
            .catch((error) => {
                this.task.error = "The fetch operation failed while getting the login cookie. \n" + error;
                throw error;
            });
        }

        /**
         * Helper method to extract the hostname from a URL
         * @param url
         * @returns hostname
         */
        this.extractHostname = (url) => {
            let hostname;
            //find & remove protocol (http, ftp, etc.) and get hostname

            if (url.indexOf("//") > -1) {
                hostname = url.split('/')[2];
            } else {
                hostname = url.split('/')[0];
            }

            //find & remove port number
            hostname = hostname.split(':')[0];
            //find & remove "?"
            hostname = hostname.split('?')[0];

            return hostname;
        }
    }
}


