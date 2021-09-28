const DbConnection = require('../DbConnection.js').DbConnection;

describe('DbConnection tests', () => {
    jest.setTimeout(30000);

    beforeEach(() => {
        process.env.DB_TM_HOST = 'localhost';
        process.env.DB_TM_USERNAME = 'tester';
        process.env.DB_TM_PASSWORD = 'testing';
        process.env.DB_TM_NAME = 'test_db';
        jest.resetModules();
        jest.resetAllMocks();
    });

    afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
    });

    test('startConnection() success', async () => {
        let db = new DbConnection();
        let consoleSpy = jest.spyOn(console, 'log');
        db.db.connect = jest.fn().mockResolvedValueOnce(true);
        await expect(db.startConnection()).resolves.not.toThrow(expect.anything());
    });

    test('startConnection() failure', async () => {
        let db = new DbConnection();
        db.db.connect = jest.fn().mockImplementation(() => {
            throw new Error('mock error');
        });
        try {
            await db.startConnection();
        } catch (e) {
            expect(e.message).toBe('mock error');
        }
    });

    test('endConnection() success', async () => {
        let db = new DbConnection();
        let consoleSpy = jest.spyOn(console, 'log');
        db.db.end = jest.fn().mockResolvedValueOnce(true);
        await expect(db.endConnection()).resolves.not.toThrow(expect.anything());
    });

    test('endConnection() failure', async () => {
        let db = new DbConnection();
        db.db.end = jest.fn().mockImplementation(() => {
            throw new Error('mock error');
        });
        try {
            await db.endConnection();
        } catch (e) {
            expect(e.message).toBe('mock error');
        }
    });

    test("query() returns promise", () => {
        let db = new DbConnection();
        db.db.query = jest.fn();
        expect(db.query("fakeSQL", ["fakeArg"])).resolves.toBe({});
    });

    test('createPa11yUser() success', async () => {
        let db = new DbConnection();
        const mockEmail = 'test@test.com';
        jest.spyOn(console, 'log');
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce({insertId: 222})
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true);
        let customer_id = await db.createPa11yUser(mockEmail);
        expect(customer_id).toBe(111);
    });

    test('createPa11yUser() failure', async () => {
        let db = new DbConnection();
        const mockEmail = 'test@test.com';
        db.query = jest.fn().mockImplementationOnce(() => {
            throw new Error('mock error');
        });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
                            .mockImplementationOnce(() => {
                                throw new Error('mock error 2');
                            });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error 2');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
                            .mockResolvedValueOnce(true)
                            .mockImplementationOnce(() => {
                                throw new Error('mock error 3');
                            });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error 3');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce({insertId: 222})
            .mockImplementationOnce(() => {
                throw new Error('mock error 4');
            });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error 4');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce({insertId: 222})
            .mockResolvedValueOnce(true)
            .mockImplementationOnce(() => {
                throw new Error('mock error 5');
            });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error 5');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce({insertId: 222})
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockImplementationOnce(() => {
                throw new Error('mock error 6');
            });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error 6');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce({insertId: 111})
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce({insertId: 222})
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockImplementationOnce(() => {
                throw new Error('mock error 7');
            });
        try {
            await db.createPa11yUser(mockEmail);
        } catch (e) {
            expect(e.message).toBe('mock error 7');
        }
    });

    test('deletePa11yUser() success', async () => {
        let db = new DbConnection();
        const mockEmail = 'test@test.com';
        const mockCustomerId = 666;
        jest.spyOn(console, 'log');
        db.query = jest.fn().mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true);
        await db.deletePa11yUser(mockEmail, mockCustomerId);
    });

    test('deletePa11yUser() failure', async () => {
        let db = new DbConnection();
        const mockEmail = 'test@test.com';
        const mockCustomerId = 666;
        db.query = jest.fn().mockImplementation(() => {
            throw new Error('mock error');
        });
        try {
            await db.deletePa11yUser(mockEmail, mockCustomerId);
        } catch (e) {
            expect(e.message).toBe('mock error');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce(true)
                            .mockImplementation(() => {
                                throw new Error('mock error 2');
                            });
        try {
            await db.deletePa11yUser(mockEmail, mockCustomerId);
        } catch (e) {
            expect(e.message).toBe('mock error 2');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce(true)
                            .mockResolvedValueOnce(true)
                            .mockImplementation(() => {
                                throw new Error('mock error 3');
                            });
        try {
            await db.deletePa11yUser(mockEmail, mockCustomerId);
        } catch (e) {
            expect(e.message).toBe('mock error 3');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockImplementation(() => {
                throw new Error('mock error 4');
            });
        try {
            await db.deletePa11yUser(mockEmail, mockCustomerId);
        } catch (e) {
            expect(e.message).toBe('mock error 4');
        }

        // Reset db
        db = new DbConnection();
        db.query = jest.fn().mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(true)
            .mockImplementation(() => {
                throw new Error('mock error 5');
            });
        try {
            await db.deletePa11yUser(mockEmail, mockCustomerId);
        } catch (e) {
            expect(e.message).toBe('mock error 5');
        }
    });
});