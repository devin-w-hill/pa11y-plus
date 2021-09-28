/**
 * DbConnection is the Database interface to create and delete Pa11y test users
 *
 */

const mysql = require('mysql');
const util = require('util');
require('dotenv').config();

module.exports.DbConnection = class DbConnection {

    constructor() {
        this.mysql = mysql;
        this.db = this.mysql.createConnection({
            host: process.env.DB_TM_HOST,
            user: process.env.DB_TM_USERNAME,
            password: process.env.DB_TM_PASSWORD,
            database: process.env.DB_TM_NAME
        });

        this.startConnection = async () => {
            try {
                await this.db.connect();
            } catch (e) {
                throw e;
            }
        }

        this.endConnection = async () => {
            try {
                await this.db.end();
            } catch (e) {
                throw e;
            }
        }

        this.query = ( sql, args ) => {
            return util.promisify( this.db.query )
                .call( this.db, sql, args );
        }

        this.createPa11yUser = async (email) => {
            let sql = "INSERT INTO user_table(firstname, lastname, email_address, password, secret_question, secret_answer) VALUES ('Pa11y', 'Worker', '" + email + "' , 1234567890, 'password', '', '')";
            let user_id = null;
            try {
                let results = await this.query(sql);
                user_id = results.insertId;
            } catch (e) {
                throw e;
            }
            return user_id;
        }

        this.deletePa11yUser = async (email) => {
            let sql = "DELETE FROM user_table WHERE email_address='" + email + "';";
            try {
                await this.query(sql);
            } catch (e) {
                throw e;
            }
        }
    }
}