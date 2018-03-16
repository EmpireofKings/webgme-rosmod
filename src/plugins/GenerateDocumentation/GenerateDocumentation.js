/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 0.14.0 from webgme on Tue Apr 12 2016 13:46:59 GMT-0500 (CDT).
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/ejs', // for ejs templates
    'common/util/xmljsonconverter', // used to save model as json
    'plugin/GenerateDocumentation/GenerateDocumentation/Templates/Templates', // 
    'remote-utils/remote-utils',
    'webgme-to-json/webgme-to-json',
    'rosmod/processor',
    'q'
], function (
    PluginConfig,
    PluginBase,
    pluginMetadata,
    ejs,
    Converter,
    TEMPLATES,
    utils,
    webgmeToJson,
    processor,
    Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of GenerateDocumentation.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin GenerateDocumentation.
     * @constructor
     */
    var GenerateDocumentation = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
        this.FILES = {
            'conf': 'conf.py.ejs'
        };
    };

    GenerateDocumentation.metadata = pluginMetadata;

    // Prototypal inheritance from PluginBase.
    GenerateDocumentation.prototype = Object.create(PluginBase.prototype);
    GenerateDocumentation.prototype.constructor = GenerateDocumentation;

    GenerateDocumentation.prototype.notify = function(level, msg) {
        var self = this;
        var prefix = self.projectId + '::' + self.projectName + '::' + level + '::';
        var max_msg_len = 100;
        if (level=='error')
            self.logger.error(msg);
        else if (level=='debug')
            self.logger.debug(msg);
        else if (level=='info')
            self.logger.info(msg);
        else if (level=='warning')
            self.logger.warn(msg);
        self.createMessage(self.activeNode, msg, level);
        if (msg.length < max_msg_len)
            self.sendNotification(prefix+msg);
        else {
            var splitMsgs = utils.chunkString(msg, max_msg_len);
            splitMsgs.map(function(splitMsg) {
                self.sendNotification(prefix+splitMsg);
            });
        }
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    GenerateDocumentation.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this;

        // Default fails
        self.result.success = false;

        // What did the user select for our configuration?
        var currentConfig = self.getCurrentConfig();
        self.returnZip = currentConfig.returnZip;
        self.runningOnClient = false;

        if (typeof WebGMEGlobal !== 'undefined') {
            self.runningOnClient = true;
            callback(new Error('Cannot run ' + self.getName() + ' in the browser!'), self.result);
            return;
        }
        
        var path = require('path');

        // the active node for this plugin is project
        var projectNode = self.activeNode;
        self.projectName = self.core.getAttribute(projectNode, 'name');
        // Setting up variables that will be used by various functions of this plugin
        self.gen_dir = path.join(process.cwd(),
                                 'generated',
                                 self.project.projectId,
                                 self.branchName,
                                 self.projectName,
                                 'manual');

        self.projectModel = {}; // will be filled out by loadProjectModel (and associated functions)
        self.nodesWithDocs = {}; // keep track of where the docs are
        self.srcData = {};
        self.rstData = {};

        webgmeToJson.notify = function(level, msg) {self.notify(level, msg);}
        utils.notify = function(level, msg) {self.notify(level, msg);}

        webgmeToJson.loadModel(self.core, self.rootNode, projectNode, true)
            .then(function (projectModel) {
		processor.processModel(projectModel);
                self.projectModel = projectModel.root;
                self.objectDict = projectModel.objects
            })
            .then(function () {
                return self.generateArtifacts();
            })
            .then(function () {
                return self.buildDocs();
            })
            .then(function () {
                return self.createZip();
            })
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                self.notify('error', err);
                self.result.setSuccess(false);
                callback(err, self.result);
            })
                .done();
    };

    GenerateDocumentation.prototype.generateArtifacts = function() {
        var self = this;
        var child_process = require('child_process');
        var path = require('path');

        self.notify('info', 'Generating Artifacts.');

        var prefix = 'src';
        var dir = path.join(
            self.gen_dir, 
            prefix
        );
        
        // clear out any previous project files
        child_process.execSync('rm -rf ' + self.gen_dir);

        var paths = Object.keys(self.objectDict);
        var tasks = paths.map(function(path) {
            var obj = self.objectDict[path];
            if (obj.type != 'Documentation')
                return self.generateObjectDocumentation(obj);
        });
        return Q.all(tasks)
            .then(function() {
                // figure out which trees contain docs
                self.buildDocTree(self.projectModel);
                // now add relevant ToC to each generated rst
                var rstPaths = Object.keys(self.rstData);
                rstPaths.map((rstPath) => {
                    self.rstData[rstPath] = self.addToC(
                        self.objectDict[rstPath],
                        self.rstData[rstPath]
                    );
                });
            })
            .then(function() {
                // write src files out (.md)
                var srcFileData = {};
                var srcPaths = Object.keys(self.srcData);
                srcPaths.map((srcPath) => {
                    var fname = self.pathToFileName(srcPath) + '.md';
                    srcFileData[fname] = self.srcData[srcPath]; 
               });
                return self.writeFiles(dir, srcFileData);
            })
            .then(function() {
                // write converted files out (.rst)
                var rstFileData = {};
                var rstPaths = Object.keys(self.rstData);
                rstPaths.map((rstPath) => {
                    var fname = self.pathToFileName(rstPath) + '.rst';
                    rstFileData[fname] = self.rstData[rstPath];
                });
                return self.writeFiles(dir, rstFileData);
            })
            .then(function() {
                self.rootRST = self.pathToFileName(self.projectModel.path);
                if (!self.objectHasDoc(self.projectModel)) {
                    // write a root ToC file if docs aren't a part of the root object
                    var fileData = {
                        'rootFile.rst': self.addToC(self.projectModel, '')
                    };
                    self.rootRST = 'rootFile';
                    return self.writeFiles(dir, fileData);
                }
            })
            .then(function() {
                return self.writeTemplate();
            })
            .then(function() {
                return self.copyStatic();
            })
            .then(function() {
                self.notify('info', 'Generated Artifacts');
            });
    };

    GenerateDocumentation.prototype.objectHasDoc = function(object) {
        var self = this;
        if (object.Documentation_list) {
            var docObj = object.Documentation_list[0];
            var documentation = docObj.documentation;
            return documentation.length > 0;
        }
        return false;
    };

    GenerateDocumentation.prototype.buildDocTree = function(object) {
        var self = this;
        var closestChildDocs = [];

        object.childPaths.map((childPath) => {
            if (self.nodesWithDocs[childPath] !== undefined) {
                closestChildDocs.push(childPath);
                self.buildDocTree(self.objectDict[childPath]);
            }
            else {
                closestChildDocs = closestChildDocs.concat(
                    self.buildDocTree(self.objectDict[childPath])
                );
            }
        });
        object.closestDocSubTrees = closestChildDocs;
        return closestChildDocs;
    };

    GenerateDocumentation.prototype.writeTemplate = function() {
        var self = this;
        var path = require('path');
        var filendir = require('filendir');
        var filesToAdd = {};
        var prefix = 'src';
        var configTemplate = TEMPLATES[self.FILES['conf']];
        var configName = prefix + '/conf.py';
        filesToAdd[configName] = ejs.render(configTemplate, {
            'projectName': self.projectName,
            'masterDoc' : self.rootRST,
            'authors' : self.projectModel.Authors
        });
        var fileNames = Object.keys(filesToAdd);
        var tasks = fileNames.map(function(fileName) {
            var deferred = Q.defer();
            var data = filesToAdd[fileName];
            filendir.writeFile(path.join(self.gen_dir, fileName), data, function(err) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve();
                }
            });
            return deferred.promise;
        });

        return Q.all(tasks)
            .then(function() {
                var msg = 'Wrote config.';
                self.notify('info', msg);
            });
    };

    GenerateDocumentation.prototype.copyStatic = function() {
        var self = this;
        var fs = require('fs');
        var path = require('path');
        var unzip = require('unzip');
        var fstream = require('fstream');

        var deferred = Q.defer();

        var staticFile = path.join(process.cwd(), 'src/plugins/GenerateDocumentation/static.zip');
        var readStream = fs.createReadStream(staticFile);
        
        var writeStream = fstream.Writer(self.gen_dir);
        if (writeStream == undefined) {
            throw new String('Couldn\'t open '+self.gen_dir);
        }

        writeStream.on('unpipe', () => { deferred.resolve(); } );

        readStream
            .pipe(unzip.Parse())
            .pipe(writeStream);
        return deferred.promise;
    };

    GenerateDocumentation.prototype.pathToFileName = function(path) {
        var self = this;
        return self.projectName.replace(/ /g,'_').toLowerCase() + path.replace(/\//g, '_');
    };

    GenerateDocumentation.prototype.addToC = function(obj, str) {
        var self = this;
        if (obj.closestDocSubTrees !== undefined && obj.closestDocSubTrees.length > 0) {
            str += '\n.. toctree::\n    :includehidden:\n    :maxdepth: 2\n\n';
            obj.closestDocSubTrees.map(function(childPath) {
                str += '    '+self.pathToFileName(childPath) + '\n';
            });
        }
        return str;
    };

    GenerateDocumentation.prototype.generateObjectDocumentation = function(obj) {
        var self = this;
        var path = require('path');
        var fs = require('fs');
        var child_process=  require('child_process');
        var filendir = require('filendir');

        var deferred = Q.defer();

        if (obj.Documentation_list) {
            obj.Documentation_list.map(function(documentation) {
                // do something with docs here
                if (documentation.documentation) {
                    self.nodesWithDocs[obj.path] = obj;
                    self.srcData[obj.path] = documentation.documentation;
                    var result = '';
		    var pandoc = child_process.spawn('pandoc', ['-f','markdown','-t','rst']);
		    pandoc.stdout.on('data', function(data) {
                        result += data + '';
		    });
		    pandoc.stdout.on('end', function() {
                        self.rstData[obj.path] = result;
                        deferred.resolve();
		    });
		    pandoc.stderr.on('data', function(err) {
                        deferred.reject('Conversion with pandoc failed: ' + err);
		    });
		    pandoc.on('error', function(err) {
                        deferred.reject('Failed to start pandoc process (pandoc might not be installed): ' + err);
		    });
		    pandoc.stdin.end(documentation.documentation, 'utf-8');
                }
                else {
                    deferred.resolve();
                }
            });
        }
        else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    GenerateDocumentation.prototype.writeFiles = function(dir, fileDict) {
        var self = this;
        var path = require('path');
        var fs = require('fs');
        var filendir = require('filendir');

        var fileNames = Object.keys(fileDict);
        var tasks = fileNames.map((fileName) => {
            var deferred = Q.defer();
            var file = path.join(dir, fileName);
            filendir.writeFile(file, fileDict[fileName], function (err) {
                if (err) {
                    deferred.reject('Writing file failed: ' + err);
                }
                else {
                    deferred.resolve();
                }
            });
        });
        return Q.all(tasks);
    };

    GenerateDocumentation.prototype.buildDocs = function() {
        var self = this;

        self.notify('info', 'Building docs into HTML and PDF');

        var deferred = Q.defer();
        var terminal=  require('child_process').spawn('bash', [], {cwd:self.gen_dir});
        var stdout = '',
        stderr = '';
        terminal.stdout.on('data', function (data) { stdout += data; });
        terminal.stderr.on('data', function (data) { stderr += data; });
        terminal.on('exit', function(code) {
            var files = {
                'docs.stdout.txt': stdout,
                'docs.stderr.txt': stderr
            };
            var fnames = Object.keys(files);
            var tasks = fnames.map((fname) => {
                return self.blobClient.putFile(fname, files[fname])
                    .then((hash) => {
                        self.result.addArtifact(hash);
                    });
            });
            return Q.all(tasks)
                .then(() => {
                    if (code == 0) {
                        deferred.resolve(code);
                    }
                    else {
                        deferred.reject('buildDocs:: child process exited with code ' + code);
                    }
                });
        });
        var pdfName = self.projectName.replace(/ /g, '') + '.pdf';
        setTimeout(function() {
            terminal.stdin.write('make\n');
            terminal.stdin.write('make pdf\n');
            terminal.stdin.write('mv ./build/html .\n');
            terminal.stdin.write('mv ./build/pdf/'+pdfName+' .\n');
            terminal.stdin.write('rm -rf ./build/pdf/\n');
            terminal.stdin.write('rm -rf ./build\n');
            terminal.stdin.end();
        }, 1000);
        return deferred.promise;
    };

    GenerateDocumentation.prototype.createZip = function() {
        var self = this;
        
        if (!self.returnZip || self.runningOnClient) {
            self.notify('info', 'Skipping compression.');
            return;
        }

        self.notify('info', 'Starting compression.');
        
        return new Promise(function(resolve, reject) {
            var zlib = require('zlib'),
            tar = require('tar'),
            fstream = require('fstream'),
            input = self.gen_dir;

            var bufs = [];
            var packer = tar.Pack()
                .on('error', function(e) { reject(e); });

            var gzipper = zlib.Gzip()
                .on('error', function(e) { reject(e); })
                .on('data', function(d) { bufs.push(d); })
                .on('end', function() {
                    var buf = Buffer.concat(bufs);
                    var name = self.projectName + '+Documentation';
                    self.blobClient.putFile(name+'.tar.gz',buf)
                        .then(function (hash) {
                            self.result.addArtifact(hash);
                            resolve();
                        })
                        .catch(function(err) {
                            reject(err);
                        })
                            .done();
                });

            var reader = fstream.Reader({ 'path': input, 'type': 'Directory' })
                .on('error', function(e) { reject(e); });

            reader
                .pipe(packer)
                .pipe(gzipper);
        })
            .then(function() {
                self.notify('info', 'Created archive.');
            });
    };

    return GenerateDocumentation;
});
