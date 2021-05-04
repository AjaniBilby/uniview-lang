const fs = require('fs');
const os = require('os');

const util = require('util');
const spawn = require("child_process").spawn;

const path = require('path');

let flags = {
	clang: process.argv.includes('--bin'),
	exec: process.argv.includes('--exec')
};
if (flags.exec) {
	flags.clang = true;
}

let extraArgs = [];
if (flags.exec) {
	extraArgs.push('--execute');
} else if (!flags.clang) {
	extraArgs.push('--verifyOnly')
}


const root = path.resolve(__dirname, "../");

let total = 0;
let completed = 0;
let fails = 0;

function Compile(filename, id) {
	let target = path.relative(root, filename);

	let msg  = `  File : ${target}\n`;
	    msg += `  ID   : ${id}\n`;
	let failed = false;

	return new Promise((res, rej) => {

		let log = "";
		let start = Date.now();
		let compile = spawn(`node`, [
			"compiler/compile.js", target,
			"-o", `./test/temp/${id}`
		].concat(extraArgs), {
			cwd: path.resolve(__dirname, "../")
		});
		compile.stdout.on('data', (data) => {
			log += data.toString();
		});
		compile.stderr.on('data', (data) => {
			log += data.toString();
		});

		compile.on('close', (code) => {
			let end = Date.now();
			if (code !== 0) {
				msg += log; // only include the log on failure
				failed = true;
				fails++;
			}

			let duration = (end-start)/1000;
			msg += `\n\n  Time: ${duration}s`;

			completed++;

			console.info("\nTest", completed, ' of ', total);
			console.log(msg);
			console.log(failed ? "  FAILED" : "  success");
			res();
		});
	});
}




let tests = [
	"cast.uv",
	"compare.uv",
	"first-execution.uv",
	"library-behaviour.uv",
	"math.uv",
	"struct.uv"
].map( x => {
	return path.resolve("./test/pre-alpha", x);
});
total = tests.length;


async function Test () {
	let test_path = path.resolve(root, "./test/temp/");
	console.log('Test space', test_path);
	console.log(" ");
	if (!fs.existsSync(test_path) ) {
		fs.mkdirSync(test_path);
	}

	let tasks = [];
	let id = 0;
	for (let file of tests) {
		tasks.push(Compile(file, id++));
	}

	await Promise.all(tasks);

	console.log(`\nFailed ${fails} of ${tests.length}`);

	if (fails > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
}

Test();