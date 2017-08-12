const PORT = 5004;
const TMP = 'tmp-qmk-';

const Express = require('express');
const BodyParser = require('body-parser');
const Crypto = require('crypto');
const Exec = require('child_process').exec;
const ExecSync = require('child_process').execSync;
const Fs = require('fs');
const request = require('request');
const zlib = require('zlib');
const co = require('co');

// Create the express app.
const app = Express();
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

// Allow cross-origin requests.
app.all('*', (req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
});

// Download the latest QMK and extract it
ExecSync('curl -sS https://codeload.github.com/qmk/qmk_firmware/zip/master > qmk_firmware.zip');
ExecSync('rm -fdr qmk_firmware');
ExecSync("unzip qmk_firmware.zip -d qmk_firmware");
ExecSync("mv qmk_firmware/qmk_firmware-master/* qmk_firmware/");
ExecSync("rm -fdr qmk_firmware.zip qmk_firmware/qmk_firmware-master static/files/qmk_firmware.zip");
ExecSync("cd qmk_firmware && zip -r ../static/files/qmk_firmware.zip *");

// Set up the /build route.
app.post('/build', (req, res) => {
	// Get the files.
	const files = req.body;

	// Create a random key.
	const key = Crypto.randomBytes(16).toString('hex');

	// Setup helper functions.
	const clean = () => {
		Exec('rm -rf ' + TMP + key);
	};

	const sendError = err => {
		res.json({ error: err });
		clean();
	};

	// Start.
	co(function*() {
		// Copy the QMK files.
		yield new Promise((resolve, reject) => {
			Exec('cp -rp qmk_firmware ' + TMP + key, (err, stdout, stderr) => {
				if (err) return reject('Failed to copy QMK files: ' + err);
				resolve();
			});
		});

		// Copy generator specific files.
		yield new Promise((resolve, reject) => {
			Exec('cp -rp server/kb ' + TMP + key + '/keyboards/', (err, stdout, stderr) => {
				if (err) return reject('Failed to copy generator specific files: ' + err);
				resolve();
			});
		});

		// Copy generated files.
		for (const file in files) {
			yield new Promise((resolve, reject) => {
				const fileName = file.replace('keyboards', TMP + key + 'keyboards');
				Fs.writeFile(fileName, files[file], err => {
					if (err) return reject('Failed to copy generated files: ' + err);
					resolve();
				});
			});
		}

		// Make.
		yield new Promise((resolve, reject) => {
			Exec('cd ' + TMP + key + '/keyboards/kb && make kb-default', (err, stdout, stderr) => {
				if (err) return reject(stderr);
				resolve();
			});
		});

		// Read the hex file.
		const hex = yield new Promise((resolve, reject) => {
			Fs.readFile(TMP + key + '/kb_default.hex', 'utf8', (err, data) => {
				if (err) return reject('Failed to read hex file.');
				resolve(data);
			});
		});

		// Send the hex file.
		res.json({ hex: hex });

		// Clean up.
		clean();
	}).catch(e => sendError(e));
});

// Start listening.
app.listen(PORT, () => console.log('Listening on port ' + PORT + '...'));
