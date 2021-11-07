const dotenv = require('dotenv');
const path = require('path');

let dotenvResult;

if (process.argv.indexOf('--config') !== -1)
    dotenvResult = dotenv.config({
        path: path.join(
            __dirname,
            '/',
            process.argv[process.argv.indexOf('--config') + 1]
        ),
    });
else if (process.argv.indexOf('-c') !== -1)
    dotenvResult = dotenv.config({
        path: path.join(
            __dirname,
            '/',
            process.argv[process.argv.indexOf('-c') + 1]
        ),
    });
else
    dotenvResult = dotenv.config({
        path: path.join(__dirname, '.env/config.env'),
    });

if (dotenvResult.error) {
    console.log('env not found');
    console.error(dotenvResult.error);
    process.exit();
}

const app = require('./app');

const startListeningOnAnyFreePort = () =>
    new Promise((resolve, reject) => {
        const startApp = (port, resolve, reject) => {
            if (port >= process.env.BASE_PORT + process.env.POD_COUNT)
                reject(new Error('NoAddressToListen'));
            const server = app.routes
                .listen(port, () => {
                    process.env.POD_ID = port - process.env.BASE_PORT;
                    process.env.PORT = port;
                    console.log(`app running on port ${port}...`);
                    resolve();
                })
                .on('error', (err) => {
                    if (err.code === 'EADDRINUSE')
                        startApp(port + 1, resolve, reject);
                    else reject(err);
                });

            process.on('SIGTERM', () => {
                console.error('ridemane bozorg');
                server.close(console.log('terminating server...'));
            });
        };
        startApp(+process.env.BASE_PORT, resolve, reject);
    });

startListeningOnAnyFreePort()
    .then(app.initialize)
    .then(() => {
        console.log('Nowhere started successfully');
    })
    .catch((err) => {
        console.error('There was a problem with run Nowhere');
        console.error(err);
    });
