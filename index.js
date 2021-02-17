
const express = require('express');
const app = express();
const fs = require('fs');
const del = require('del');
const env = require('dotenv');
const path = require('path');

var bodyParser = require('body-parser');
jsonBodyParser = bodyParser.json();
app.use(bodyParser.urlencoded({ extended: false }));

const children = {};
const { fork } = require('child_process');


const auth = (req, res) => {
	console.log(req.body);
	if (req.body.pass === process.env.PASSWORD) return true;
	else return false;
}

//app.use(auth);

app.post('/children', jsonBodyParser, (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	let processes = fs.readdirSync(process.cwd() + '/processes');
	return res.send('GOOD: ' + processes);
});

app.post('/children/:child', jsonBodyParser, (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	let dirs = fs.readdirSync(`${process.cwd()}/processes/${req.params.child}`);
	let directory = [];
	for (const dir of dirs) { 
		var stats = fs.statSync(`${process.cwd()}/processes/${req.params.child}/${dir}`);
		if (stats.isFile() === true) {
			directory.push({'type':'file', 'name':dir});
		} else if (stats.isDirectory() === true) {
			directory.push({'type':'directory', 'name':dir});
		}
	}
	return res.send('GOOD: ' + JSON.stringify(directory));
});

app.post('/children/:child/fetch', jsonBodyParser, (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	let directory = `${process.cwd()}/processes/${req.params.child}/`;
	if (req.body.directory) directory += `${req.body.directory}/`;
	if (!req.body.name) return res.send('BAD: Directory or file name not provided!');
	directory += req.body.name;
	if (!req.body.type) return res.send('BAD: Type not provided!');
	// Gets all the necessary variables ready ^^

	if (req.body.type === 'file') { // Reads a file and returns the filedata as text/plain
		try {
			filedata = fs.readFileSync(directory);
			res.header("Content-Type", "text/plain");
			return res.send('GOOD: ' + filedata);
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	} else if (req.body.type === 'directory') { // Reads a directory and returns it as a stringified array
		try {
			let directories = [];
			dirs = fs.readdirSync(directory);
			console.log(directory);
			for (const dir of dirs) {
				var stats = fs.statSync(`${directory}/${dir}`);
				if (stats.isFile() === true) {
					directories.push({'type':'file', 'name':dir});
				} else if (stats.isDirectory() === true) {
					directories.push({'type':'directory', 'name':dir});
				}
			}
			return res.send('GOOD: ' + JSON.stringify(directories));
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	}
});

app.post('/children/:child/post', jsonBodyParser, (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	let directory = `${process.cwd()}/processes/${req.params.child}/`;
	if (req.body.directory) directory += `${req.body.directory}/`;
	if (!req.body.name) return res.send('BAD: Directory or file name not provided!');
	directory += req.body.name;
	if (!req.body.type) return res.send('BAD: Type not provided!');
	// Gets all the necessary variables ready ^^

	if (req.body.type === 'file') { // Makes the file
		try {
			filedata = fs.writeFileSync(directory, req.body.data);
			res.header("Content-Type", "text/plain");
			return res.send('GOOD: ' + req.body.data);
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	} else if (req.body.type === 'directory') { // Makes the directory
		try {
			dirs = fs.mkdirSync(directory);
			return res.send('GOOD: ' + 'success!');
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	}
});


app.post('/children/:child/delete', jsonBodyParser, async (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	let directory = `${process.cwd()}/processes/${req.params.child}/`;
	if (req.body.directory) directory += `${req.body.directory}/`;
	if (!req.body.name) return res.send('BAD: Directory or file name not provided!');
	directory += req.body.name;
	if (!req.body.type) return res.send('BAD: Type not provided!');
	// Gets all the necessary variables ready ^^

	if (req.body.type === 'file') { // Deletes the file
		try {
			filedata = fs.unlinkSync(directory);
			res.header("Content-Type", "text/plain");
			return res.send('GOOD: ' + 'success!');
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	} else if (req.body.type === 'directory') { // Deletes the directory
		try {
			try {
				await del(directory);

				return res.send('GOOD: ' + 'success!');
			} catch (err) {
				if (err) return res.send('BAD: ' + err);
			}
			
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	}
});
app.post('/children/:child/settings', jsonBodyParser, async (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	if (!req.body.data) return res.send('No settings data provided!');
	if (!req.body.intent) return res.send('No intent provided!');
	if (req.body.intent === 'write') {
		try {
			fs.writeFileSync(`${process.cwd()}/inits/${req.params.child}.json`, req.body.data, (err) => {
				if (err) return res.send('BAD: ' + err);
			});
			return res.send('GOOD: Success!');
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	} else if (req.body.intent === 'retrieve') {
		try {
			let response = fs.readFileSync(`${process.cwd()}/inits/${req.params.child}.json`);
			return res.send(`GOOD: ${response}`);
		} catch (err) {
			if (err) return res.send('BAD: ' + err);
		}
	}
		
});

app.post('/children/:child/run', jsonBodyParser, async (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	try {
		let child = req.params.child;
		let obj = fs.readFileSync(`${process.cwd()}/inits/${child}.json`);
		obj = JSON.parse(obj);
		children[child] = fork(`processes/${child}/${obj.run}`, obj.args);

		children[child].on('message', ({intent, data}) => {
			if (intent === 'console.log') console.log('Message from child:', data);
		});

		return res.send('GOOD: Success!');
	} catch (err) {
		if (err) return res.send('BAD: ' + err);
	}
});

app.post('/children/:child/kill', jsonBodyParser, async (req, res) => {
	if (auth(req,res) === false) return res.send('BAD: Invalid Credentials!');
	try {
		let child = req.params.child;
		children[child].exit(0);
		return res.send('GOOD: Success!');
	} catch (err) {
		if (err) return res.send('BAD: ' + err);
	}
});

app.listen(3000);

//fs.unlinkSync()
//console.log(fs.readdirSync(`${__dirname}/processes/test/boop/beep`));