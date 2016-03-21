

define(['q'], function(Q) {
    'use strict';
    return {
	executeOnHost: function(cmds, ip, user, cb_message, cb_complete, cb_processing, cb_error) {
	    var self = this;
	    var ssh2shell = require('ssh2shell');
	    var output = {
		user: user,
		ip: ip,
		stdout: ''
	    };
	    return new Promise(function(resolve, reject) {
		var host = {
		    server: {
			host: ip,
			port: 22,
			userName: user.name,
			privateKey: require('fs').readFileSync(user.key)
		    },
		    commands: cmds,
		    idleTimeOut: 10000,
		    msg: {
			send: function( message ) {
			    if (cb_message)
				cb_message(message);
			}
		    },
		    onCommandProcessing: function( command, response, sshObj, stream ) {
			if (cb_processing)
			    cb_processing(command, response);
		    },
		    onCommandComplete: function( command, response, sshObj ) {
			if (cb_complete)
			    cb_complete(command, response);
		    },
		    onCommandTimeout: function( command, response, sshObj, stream, connection) {
			// pass through, we don't want to time out
		    },
		    onEnd: function( sessionText, sshObj ) {
			output.stdout = sessionText;
		    }
		};
		var ssh = new ssh2shell(host);
		/*
		ssh.on ("error", function(err, type, close, cb) {
		    reject(err + ' on ' + user.name + '@' + ip);
		    if (cb_error)
			cb_error(err, type, close, cb);
		});
		*/
		ssh.on("close", function(hadError) {
		    if (hadError) {
			reject();
		    }
		    else {
			resolve(output);
		    }
		});
		ssh.connect();
	    });
	},
	parseMakePercentOutput: function(output) {
	    var regex = /[0-9]+%/gm;
	    var match = null;
	    var retVals = [];
	    while (match = regex.exec(output)) {
		var percent = parseInt(new String(match).replace('%',''), 10);
		retVals.push(percent);
	    }
	    return retVals;
	},
	parseMakeErrorOutput: function(output) {
	    var regex = /([^:^\n]+):(\d+):(\d+):\s(\w+\s*\w*):\s(.+)\n(\s+)(.*)\s+\^+/gm;
	    var match = null;
	    var retVals = [];
	    while (match = regex.exec(output)) {
		retVals.push({
		    filename:       match[1].replace(self.gen_dir + '/src/', ''),
		    packageName:    filename.split('/')[0],
		    line:           parseInt(match[2]),
		    column:         parseInt(match[3]),
		    type:           match[4],
		    text:           match[5],
		    codeWhitespace: match[6],
		    code:           match[7],
		    adjustedColumn: column - codeWhitespace.length
		});
	    }
	    return retVals;
	},
	mkdirRemote: function(dir, ip, user) {
	    var client = require('scp2');
	    client.defaults({
		host: ip,
		username: user.name,
		privateKey: require('fs').readFileSync(user.key),
	    });
	    return new Promise(function(resolve, reject) {
		client.mkdir(dir, function(err) {
		    if (err)
			reject();
		    else
			resolve();
		});
	    });
	},
	copyToHost: function(from, to, ip, user) {
	    var client = require('scp2');
	    return new Promise(function(resolve, reject) {
		client.scp(from, {
		    host: ip,
		    username: user.name,
		    privateKey: require('fs').readFileSync(user.key),
		    path: to
		}, function(err) {
		    if (err)
			reject();
		    else
			resolve();
		});
	    });
	},
	copyFromHost: function(from, to, ip, user) {
	    var client = require('scp2');
	    return new Promise(function(resolve, reject) {
		client.scp({
		    host: ip,
		    username: user.name,
		    privateKey: require('fs').readFileSync(user.key),
		    path: from
		}, to, function(err) {
		    if (err)
			reject(err);
		    else
			resolve();
		});
	    });
	},
	getPidOnHost: function(procName, hosts, user, stdout_cb, stderr_cb) {
	    return new Promise(function(resolve, reject) {

		var rexec = require('remote-exec');
		var streams = require('memory-streams');
		
		var stdout_writer = new streams.WritableStream();
		stdout_writer
		    .on('data', function(data) {
			if (stdout_cb)
			    stdout_cb(data);
		    })
		    .on('end', function() {
		    });

		var stderr_writer = new streams.WritableStream();
		stderr_writer
		    .on('data', function(data) {
			if (stderr_cb)
			    stderr_cb(data);
		    })
		    .on('end', function() {
		    });

		var connection_options = {
		    port: 22,
		    readyTimeout: 50000,
		    username: user.name,
		    privateKey: require('fs').readFileSync(user.key),
		    stdout: stdout_writer,
		    stderr: stderr_writer
		};
		
		var cmds = [
		    'ps aux | grep ' + procName,
		];
		
		rexec(hosts, cmds, connection_options, function(err){
		    if (err) {
			self.logger.error(err);
			reject(false);
		    } else {
			resolve(true);
		    }
		});
	    });
	},
	wgetAndUnzipLibrary: function(file_url, dir) {
	    return new Promise(function(resolve, reject) {
		var url = require('url'),
		path = require('path'),
		fs = require('fs'),
		unzip = require('unzip'),
		fstream = require('fstream'),
		child_process = require('child_process');
		// extract the file name
		var file_name = url.parse(file_url).pathname.split('/').pop();

		var final_dir = path.join(process.cwd(), dir).toString();
		var final_file = path.join(final_dir, file_name);

		// compose the wget command; -O is output file
		var wget = 'wget --no-check-certificate -P ' + dir + ' ' + file_url;

		// excute wget using child_process' exec function
		var child = child_process.exec(wget, function(err, stdout, stderr) {
		    if (err) {
			reject(err);
		    }
		    else {
			var fname = path.join(dir,file_name);
			var readStream = fs.createReadStream(fname);
			var writeStream = fstream.Writer(dir);
			if (readStream == undefined || writeStream == undefined) {
			    reject("Couldn't open " + dir + " or " + fname);
			    return;
			}
			readStream
			    .pipe(unzip.Parse())
			    .pipe(writeStream);
			fs.unlink(fname);
			resolve('downloaded and unzipped ' + file_name + ' into ' + dir);
		    }
		});
	    });
	}
    }
});
