#!/usr/bin/env node

/**
 * Pa11y-CLI tool NodeJS entrypoint for running Pa11y ADA compliance scans via command line interface
 */


const { Pa11yCli } = require('../Pa11yCli.js');

let cli = new Pa11yCli();

// Set up and run
cli.setUp()
    .then( () => {
        cli.run()
            .then( _ => {
                cli.end(0, 'Success');
            })
            .catch( (e) => {
                cli.end(1, e.message);
            });
    })
    .catch( (e) => {
        cli.end(1, e.message);
    });