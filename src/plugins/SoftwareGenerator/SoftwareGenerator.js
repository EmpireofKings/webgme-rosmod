/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 0.14.0 from webgme on Wed Mar 02 2016 22:16:42 GMT-0600 (Central Standard Time).
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'common/util/ejs', // for ejs templates
    'common/util/xmljsonconverter', // used to save model as json
    'plugin/SoftwareGenerator/SoftwareGenerator/Templates/Templates', // 
    'remote-utils/remote-utils',
    'webgme-to-json/webgme-to-json',
    'rosmod/processor',
    // hfsm
    'hfsm-library/src/plugins/SoftwareGenerator/SoftwareGenerator',
    // promises
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
    // hfsm
    hfsmSoftwareGenerator,
    Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of SoftwareGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin SoftwareGenerator.
     * @constructor
     */
    var SoftwareGenerator = function () {
        // Call base class' constructor.
        PluginBase.call(this);
	this.pluginMetadata = pluginMetadata;
        this.FILES = {
            'component_cpp': 'component.cpp.ejs',
            'component_hpp': 'component.hpp.ejs',
            'cmakelists': 'CMakeLists.txt.ejs',
            'package_xml': 'package_xml.ejs',
	    'doxygen_config': 'doxygen_config.ejs'
        };
    };

    SoftwareGenerator.metadata = pluginMetadata;

    // Prototypal inheritance from PluginBase.
    SoftwareGenerator.prototype = Object.create(PluginBase.prototype);
    SoftwareGenerator.prototype.constructor = SoftwareGenerator;

    SoftwareGenerator.prototype.notify = function(level, msg) {
	var self = this;
	var prefix = self.projectId + '::' + self.projectName + '::' + level + '::';
	var lines = msg.split('\n');
	lines.map(function(line) {
	    if (level=='error')
		self.logger.error(line);
	    else if (level=='debug')
		self.logger.debug(line);
	    else if (level=='info')
		self.logger.info(line);
	    else if (level=='warning')
		self.logger.warn(line);
	    self.createMessage(self.activeNode, line, level);
	    self.sendNotification(prefix+line);
	});
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
    SoftwareGenerator.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this;

        // Default fails
        self.result.success = false;

	// What did the user select for our configuration?
	var currentConfig = self.getCurrentConfig();
	self.compileCode = currentConfig.compile;
	self.generateDocs = currentConfig.generate_docs;
	self.returnZip = currentConfig.returnZip;
	self.usePTY = currentConfig.usePTY;
	self.runningOnClient = false;

        if (typeof WebGMEGlobal !== 'undefined') {
	    self.runningOnClient = true;
	    if (self.compileCode)
		self.notify('error', 'Cannot compile while running in client! Please re-run the plugin and enable server execution!');
	    if (self.generateDocs)
		self.notify('error', 'Cannot generate documentation while running in client! Please re-run the plugin and enable server execution!');
	    self.compileCode = self.generateDocs = false;
        }
	
	
	// the active node for this plugin is software -> project
	var projectNode = self.activeNode;
	self.projectName = self.core.getAttribute(projectNode, 'name');

	if (!self.runningOnClient) {
	    var path = require('path');
	    // Setting up variables that will be used by various functions of this plugin
	    self.gen_dir = path.join(process.cwd(),
				     'generated',
				     self.project.projectId,
				     self.branchName,
				     self.projectName);
	}

	self.projectModel = {}; // will be filled out by loadProjectModel (and associated functions)
	self.artifacts = {}; // will be filled out and used by various parts of this plugin
	self.artifactName = self.projectName + "+Software";
	if (self.compileCode)
	    self.artifactName += '+Binaries';
	if (self.generateDocs)
	    self.artifactName += '+Docs';

        // set up libraries
	webgmeToJson.notify = function(level, msg) {self.notify(level, msg);}
	utils.notify = function(level, msg) {self.notify(level, msg);}
        utils.trackedProcesses = ['catkin', 'rosmod_actor', 'roscore'];

      	webgmeToJson.loadModel(self.core, self.rootNode, projectNode, true, true) // resolve ptrs, keep webgme nodes
  	    .then(function (projectModel) {
                // hfsm stuff
                self.generateHFSM(projectModel);
                // regular stuff
		processor.processModel(projectModel);
		self.projectModel = projectModel.root;
		self.projectObjects = projectModel.objects;
        	return self.generateArtifacts();
  	    })
	    .then(function () {
		return self.downloadLibraries();
	    })
	    .then(function () {
		return self.runCompilation();
	    })
	    .then(function () {
		return self.generateDocumentation();
	    })
	    .then(function () {
		if (self.runningOnClient)
		    return self.returnSource();
		else
		    return self.createZip();
	    })
	    .then(function () {
        	self.result.setSuccess(true);
        	callback(null, self.result);
	    })
	    .catch(function (err) {
		if (typeof err === 'string')
		    self.notify('error', err);
        	self.result.setSuccess(false);
        	callback(err, self.result);
	    })
		.done();
    };

    SoftwareGenerator.prototype.generateHFSM = function(projectModel) {
        var self = this;
        var hfsmSW = new hfsmSoftwareGenerator();
        hfsmSW.notify = function(level, msg) {self.notify(level,msg);}

        var originalRoot = projectModel.root;

        hfsmSW.setProjectModel(projectModel);
        function objToFilePrefix(obj) {
            // object here will be a stateMachine
            // get the package name from parent->parent (comp->package)
            var filePrefix = null;
            var comp = obj.parent;
            var pkg = comp.parent;
            if (comp.type == 'Component' && pkg.type == 'Package') {
                var pkgName = pkg.name;
                var compName = comp.name;
                var prefix = 'src';
                filePrefix = prefix + '/' + pkgName + '/include/' + pkgName + '/' + compName + '_HFSM/';
            }
            return filePrefix;
        }
        // add component includes to State Machines
        Object.keys(projectModel.objects).map(function(k) {
            var obj = projectModel.objects[k];
            if (obj.type == 'State Machine') {
                var comp = projectModel.objects[obj.parentPath];
                var pkg = projectModel.objects[comp.parentPath];
                if (comp.type == 'Component' && pkg.type == 'Package') {
                    var pkgName = pkg.name;
                    var compName = comp.name;
                    var includes = [
                        `#include "${pkgName}/${compName}.hpp"`,
                        `class ${compName};`,
                        ''
                    ].join('\n');
                    obj.Includes = includes + obj.Includes;
                    // make sure we have functions and pointers to the component itself
                    var declarations = [
                        `static ${compName}* this_component;`,
                        `void setComponentPtr( ${compName}* c ) { this_component = c; }`,
                        ''
                    ].join('\n');
                    obj.Declarations = declarations + obj.Declarations;
                    var definitions = [
                        `${compName}* StateMachine::${obj.sanitizedName}::this_component;`,
                    ].join('\n');
                    obj.Definitions = definitions + obj.Definitions;
                }
            }
        });
        // now render the HFSM code
        var hfsmArtifacts = hfsmSW.generateArtifacts(self.result, false, false, objToFilePrefix)
        self.artifacts = Object.assign(self.artifacts, hfsmArtifacts);

        projectModel.root = originalRoot;
    };

    SoftwareGenerator.prototype.generateArtifacts = function () {
	var self = this,
	    prefix = 'src';

        self.artifacts[self.projectModel.name + '_metadata.json'] = JSON.stringify({
    	    projectID: self.project.projectId,
            commitHash: self.commitHash,
            branchName: self.branchName,
            timeStamp: (new Date()).toISOString(),
            pluginVersion: self.getVersion()
        }, null, 2);

	// render the doxygen template
	var doxygenConfigName = 'doxygen_config',
	    doxygenTemplate = TEMPLATES[self.FILES['doxygen_config']];
	self.artifacts[doxygenConfigName] = ejs.render(doxygenTemplate, 
						       {'projectName': self.projectName});

	var software_folder = self.projectModel.Software_list[0];
	if (software_folder && software_folder.Package_list) {
	    software_folder.Package_list.map(function(pkgInfo) {

		if (pkgInfo.Component_list) {
		    pkgInfo.Component_list.map(function(compInfo) {
			self.generateComponentFiles(prefix, pkgInfo, compInfo);
		    });
		}

		if (pkgInfo.Message_list) {
		    pkgInfo.Message_list.map(function(msgInfo) {
			var msgFileName = [prefix,
					   pkgInfo.name,
					   'msg',
					   msgInfo.name + '.msg'].join('/');
			self.artifacts[msgFileName] = msgInfo.Definition;
		    });
		}
		if (pkgInfo.Service_list) {
		    pkgInfo.Service_list.map(function(srvInfo) {
			var srvFileName = [prefix,
					   pkgInfo.name,'srv',
					   srvInfo.name + '.srv'].join('/');
			self.artifacts[srvFileName] = srvInfo.Definition;
		    });
		}

		var cmakeFileName = [prefix,
				     pkgInfo.name,
				     'CMakeLists.txt'].join('/'),
		    cmakeTemplate = TEMPLATES[self.FILES['cmakelists']];
		self.artifacts[cmakeFileName] = ejs.render(cmakeTemplate, {
		    'pkgInfo':pkgInfo, 
		    'model': self.projectModel,
                    'objects': self.projectObjects
		});

		var packageXMLFileName = [prefix,
					  pkgInfo.name,
					  'package.xml'].join('/'),
		    packageXMLTemplate = TEMPLATES[self.FILES['package_xml']];
		self.artifacts[packageXMLFileName] = ejs.render(packageXMLTemplate, {
		    'pkgInfo': pkgInfo,
		    'model': self.projectModel,
                    'objects': self.projectObjects
		});

                // generate the pkg xml under share/<package name>
		var sharedPackageXMLFileName = ['share',
					        pkgInfo.name,
					        'package.xml'].join('/');
		self.artifacts[sharedPackageXMLFileName] = self.artifacts[packageXMLFileName];
	    });
	}

	if ( self.runningOnClient ) {
	    self.notify('info', 'Generated code in client.');
	    return;
	}

	// put the files on the FS
	var path = require('path'),
	    filendir = require('filendir'),
	    child_process = require('child_process');

	// clear out any previous project files
	var binDir = utils.sanitizePath(path.join(self.gen_dir,'bin'));
	self.notify('info','Clearing out previous binaries.');
	child_process.execSync('rm -rf ' + binDir);

	var srcDir = utils.sanitizePath(path.join(self.gen_dir,'src'));
	self.notify('info','Clearing out previous generated code.');
	child_process.execSync('rm -rf ' + srcDir);

	var fileNames = Object.keys(self.artifacts);
	var tasks = fileNames.map(function(fileName) {
	    var deferred = Q.defer();
	    var data = self.artifacts[fileName];
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
		var msg = 'Generated artifacts.';
		self.notify('info', msg);
	    });
    };

    SoftwareGenerator.prototype.generateComponentFiles = function (prefix, pkgInfo, compInfo) {
	var self = this;
	var inclFileName = [prefix,
			    pkgInfo.name,
			    'include',
			    pkgInfo.name,
			    compInfo.name + '.hpp'].join('/'),
	    srcFileName = [prefix,
			   pkgInfo.name,
			   'src',
			   pkgInfo.name,
			   compInfo.name + '.cpp'].join('/'),
	    compCPPTemplate = TEMPLATES[this.FILES['component_cpp']],
	    compHPPTemplate = TEMPLATES[this.FILES['component_hpp']];
	self.artifacts[inclFileName] = ejs.render(compHPPTemplate, {
	    'compInfo': compInfo,
	    'model': self.projectModel,
            'objects': self.projectObjects
	});
	self.artifacts[srcFileName] = ejs.render(compCPPTemplate, {
	    'compInfo': compInfo,
	    'model': self.projectModel,
            'objects': self.projectObjects
	});
    };

    SoftwareGenerator.prototype.downloadLibraries = function ()
    {
	var self = this;
	if (self.runningOnClient) {
	    self.notify('info', 'Skipping source library download in client mode.');
	    return;
	}

	var path = require('path'),
	    dir = path.join(self.gen_dir, 'src');

	self.notify('info', 'Downloading Source Libraries');

	var tasks = [];
	if (self.projectModel.Software_list[0]['Source Library_list']) {
	    tasks = self.projectModel.Software_list[0]['Source Library_list'].map(function(lib) {
		self.notify('info', 'Downloading: ' + lib.name + ' from '+ lib.URL);
		return utils.wgetAndUnzipLibrary(lib.URL, dir);
	    });
	}

	return Q.all(tasks);
    };

    SoftwareGenerator.prototype.generateDocumentation = function () 
    {
	var self = this;
	if (!self.generateDocs || self.runningOnClient) {
	    var msg = 'Skipping documentation generation.'
	    self.notify('info', msg);
	    return;
	}
	var msg = 'Generating documentation.'
	self.notify('info', msg);

	var path = require('path'),
	    child_process = require('child_process');

	var docPath = utils.sanitizePath(path.join(self.gen_dir, 'doc'));
	// clear out any previous documentation
	child_process.execSync('rm -rf ' + docPath);

	var stdOut = '';
	var stdErr = '';

	var deferred = Q.defer();
	var terminal = child_process.spawn('bash', [], {cwd:self.gen_dir});
	terminal.stdout.on('data', function (data) { stdOut += data; });
	terminal.stderr.on('data', function (data) { stdErr += data; });
	terminal.on('exit', function (code) {
	    if (code == 0) {
		deferred.resolve(code);
	    }
	    else {
		var files = {
		    'documentation.stdout.txt': stdOut,
		    'documentation.stderr.txt': stdErr
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
			deferred.reject('document generation:: child process exited with code ' + code);
		    });
	    }
	});
	setTimeout(function() {
	    terminal.stdin.write('doxygen doxygen_config\n');
	    terminal.stdin.write('make -C ./doc/latex/ pdf\n');
	    terminal.stdin.write('mv ./doc/latex/refman.pdf ' + 
				 utils.sanitizePath(self.projectName) + '.pdf');
	    terminal.stdin.end();
	}, 1000);
	return deferred.promise;
    };

    SoftwareGenerator.prototype.getValidArchitectures = function() {
	var self = this,
	    validArchs = {};
	var systems_folder = self.projectModel.Systems_list[0];
	if (systems_folder && systems_folder.System_list) {
	    systems_folder.System_list.map(function(system) {
		if (system.Host_list) {
		    system.Host_list.map(function(host) {
			var devName = utils.getDeviceType(host);
			if (validArchs[devName] == undefined) {
			    validArchs[devName] = [];
			}
			validArchs[devName].push(host);
		    });
		}
	    });
	}
	return validArchs;
    };

    SoftwareGenerator.prototype.selectCompilationArchitectures = function() {
	
	var self = this;

	var validArchitectures = self.getValidArchitectures();

	var tasks = Object.keys(validArchitectures).map(function(index) {
	    return utils.getAvailableHosts(validArchitectures[index])
		.then(function(hostArr) {
		    var retObj = {};
		    retObj[index] = hostArr;
		    return retObj;
		});
	});
	return Q.all(tasks)
	    .then(function (nestedArr) {
		var validHosts = {};
		nestedArr.forEach(function(subArr) {
		    var arch = Object.keys(subArr)[0];
		    validHosts[arch] = subArr[arch];
		});
		return validHosts;
	    });
    };

    SoftwareGenerator.prototype.getObjectAttributeFromBuild = function (fileName, fileLineNumber) {
	var self = this;
	// find correct file
	var fileData = self.artifacts['src/'+fileName];
	if (fileData) {
	    // split the file string into line string array
	    var fileLines = fileData.split("\n");
	    // use line number from error to start working our way back using regex to find obj.attr
	    var regex = /\/\/::::([a-zA-Z0-9\/]*)::::([^:\s]*)::::(?:end::::)?/gi;
	    var path, attr, attrLineNumber;
	    for (var l=fileLineNumber; l>0; l--) {
		var line = fileLines[l];
		var result = regex.exec(line);
		if (result) {
		    path = result[1];
		    attr = result[2];
		    attrLineNumber = fileLineNumber - l -1;
		    break;
		}
	    }
	    var node = self.projectObjects[path];
	    return {node: node, attr: attr, lineNumber: attrLineNumber};
	}
	else {
	    return {node: null, attr: null, lineNumber: null};
	}
    };

    SoftwareGenerator.prototype.compileHasError = function(data) {
	return data.indexOf('Errors     << ') > -1 ||
	    data.indexOf('Traceback (most recent call last):') > -1 ||
	    data.indexOf('error:') > -1;
    };

    SoftwareGenerator.prototype.convertCompileMessage = function(host, data) {
	var self = this;

	var path = require('path');
	var stripANSI = require('strip-ansi');
	var base_compile_dir = path.join(host.user.Directory, 'compilation');
	var compile_dir = path.join(base_compile_dir, self.project.projectId, self.branchName);
	var removeDir = path.join(compile_dir, 'src/');

	var strippedData = stripANSI(data);

        function getParentByType(path, type) {
            var o = self.projectObjects[path];
            if (o) {
                if (o.type != type)
                    o = getParentByType(o.parentPath, type);
            } else {
                return { name: null };
            }
            return o;
        }

	if (strippedData.indexOf('error:') > -1)
	{
	    var compileErrors = utils.parseMakeErrorOutput(strippedData);
	    compileErrors.map(function(compileError) {
		var baseName = compileError.fileName.replace(removeDir, '');
		var nodeInfo = self.getObjectAttributeFromBuild(baseName, compileError.line);
		var node = nodeInfo.node,
		    attr = nodeInfo.attr,
		    lineNum = nodeInfo.lineNumber;
		if (node) {
		    var nodeName = node.name;
                    var packageName = getParentByType(node.path, 'Package').name;
                    var compName = getParentByType(node.path, 'Component').name;
                    var hfsmName = getParentByType(node.path, 'State Machine').name;
		    self.notify('error', 'Error in Package: ' + packageName + 
				', Component: ' + compName + (hfsmName ? ", HFSM: " + hfsmName : "") + ', attribute: ' + attr +
				', at line: ' + lineNum, node);
		    var msg = '<details><summary><b>Build Error:: package: ' + packageName + ', component: ' +
		        compName + (hfsmName ? ", HFSM: " + hfsmName : "")  +':</b></summary>' +
		        '<pre><code>'+
		        compileError.text +
		        '</code></pre>'+
		        '</details>';
		    self.createMessage(node.node, msg, 'error');
		}
                else {
		    var packageName = baseName.split('/')[0];
		    var compName = path.basename(compileError.fileName).split('.')[0];
		    var msg = '<details><summary><b>Build Error:: Library: ' + packageName +':</b></summary>' +
		        '<pre><code>'+
		        compileError.text +
		        '</code></pre>'+
		        '</details>';
		    self.createMessage(self.activeNode, msg, 'error');
                }
	    });
	}
	else if (strippedData.indexOf('warning:') > -1)
	{
	    var compileErrors = utils.parseMakeErrorOutput(strippedData);
	    compileErrors.map(function(compileError) {
		var baseName = compileError.fileName.replace(removeDir, '');
		var nodeInfo = self.getObjectAttributeFromBuild(baseName, compileError.line);
		var node = nodeInfo.node,
		    attr = nodeInfo.attr,
		    lineNum = nodeInfo.lineNumber;
		if (node) {
		    var nodeName = node.name;
                    var packageName = getParentByType(node.path, 'Package').name;
                    var compName = getParentByType(node.path, 'Component').name;
                    var hfsmName = getParentByType(node.path, 'State Machine').name;
		    self.notify('error', 'Warning in Package: ' + packageName + 
				', Component: ' + compName + (hfsmName ? ", HFSM: " + hfsmName : "") + ', attribute: ' + attr +
				', at line: ' + lineNum, node);
		    var msg = '<details><summary><b>Build Warning:: package: ' + packageName + ', component: ' +
		        compName + (hfsmName ? ", HFSM: " + hfsmName : "")  +':</b></summary>' +
		        '<pre><code>'+
		        compileError.text +
		        '</code></pre>'+
		        '</details>';
		    self.createMessage(node.node, msg, 'error');
		}
                else {
		    var packageName = baseName.split('/')[0];
		    var compName = path.basename(compileError.fileName).split('.')[0];
		    var msg = '<details><summary><b>Build Warning:: Library: ' + packageName +':</b></summary>' +
		        '<pre><code>'+
		        compileError.text +
		        '</code></pre>'+
		        '</details>';
		    self.createMessage(self.activeNode, msg, 'error');
                }
	    });
	}
    };

    SoftwareGenerator.prototype.parseCompileError = function(host, data) {
	var self = this;

	var path = require('path');
	var stripANSI = require('strip-ansi');
	var base_compile_dir = path.join(host.user.Directory, 'compilation');
	var compile_dir = path.join(base_compile_dir, self.project.projectId, self.branchName);
	var removeDir = path.join(compile_dir, 'src/')

	var strippedData = stripANSI(data);

	host.stdErr += data;
	
	if (host.hasError || self.compileHasError(strippedData)) {
	    host.hasError = true;
	    // see if it's a make error
	    if ( strippedData.indexOf('error:') > -1 ) {
		self.convertCompileMessage(host, data);
		//return true;
	    }
	    else if ( strippedData.indexOf('Traceback (most recent call last):') > -1) {
		//return true;
	    }
	}
	return false;
    };

    SoftwareGenerator.prototype.parseCompileData = function(host, data) {
	var self = this;

	var stripANSI = require('strip-ansi');
	var strippedData = stripANSI(data);
	
	if (host.hasError || self.compileHasError(strippedData)) {
	    return self.parseCompileError(host, data);
	}
	else {
	    host.stdOut += data;
	    // see if it's a make warning
	    if ( strippedData.indexOf('warning:') > -1 ) {
		self.convertCompileMessage(host, data);
	    }
	    else {
		// see if we can parse percent from it
		self.parseCompilePercent(host, strippedData);
	    }
	}
	return false;
    };

    SoftwareGenerator.prototype.parseCompilePercent = function (host, data) {
	var self = this;
	var percent = utils.parseMakePercentOutput(data);
	if (host.__lastPercent === undefined)
	    host.__lastPercent = 0;
	if (percent.length && percent[0] > 0 && (percent[0] - host.__lastPercent) > 4 ) {
	    var msg = 'Build on ' + utils.getDeviceType(host.host) + ': ' + percent[0] + '%';
	    host.__lastPercent = percent[0];
	    self.notify('info', msg);
	}
    };

    SoftwareGenerator.prototype.compileOnHost = function (host) {
	var self = this;
	var path = require('path');
	var mkdirp = require('mkdirp');
	var child_process = require('child_process');

	var base_compile_dir = path.join(host.user.Directory, 'compilation');
	var compile_dir = path.join(base_compile_dir, self.project.projectId, self.branchName);
	var archBinPath = path.join(self.gen_dir, 'bin' , utils.getDeviceType(host.host));

        // share folder for storing package.xmls (generated above) and the msg/srv deserialization
	var sharePath = path.join(self.gen_dir, 'share');

	var compile_commands = [
	    'cd ' + utils.sanitizePath(compile_dir),
	    'rm -rf bin',
	    'catkin config --extend ' + host.host['Build Workspace'],
	    'catkin clean -b --yes',
	    'catkin build --no-status',
	    'mkdir bin',
            'mkdir share',
	    'cp devel/lib/*.so bin/.',
            'cp -r devel/lib/python2.7/dist-packages/* share/.'
	];

	var compilationFailed = false;

	child_process.execSync('rm -rf ' + utils.sanitizePath(archBinPath));

	// make the compile dir
	return new Promise(function(resolve,reject) {
	    self.notify('info', 'making compilation directory on: ' + host.intf.IP);
	    utils.mkdirRemote(compile_dir, host.intf.IP, host.user)
		.then(function() {
		    resolve();
		})
		.catch(function() {
		    reject("Couldn't make remote compilation dir!");
		});
	})
	    .then(function() {
		// copy the sources to remote
		self.notify('info', 'copying compilation sources to: ' + host.intf.IP);
	        var srcDir = path.join(self.gen_dir,'src');
		return utils.copyToHost(srcDir, compile_dir +'/.', host.intf.IP, host.user);
	    })
	    .then(function() {
		// run the compile step
		self.notify('info', 'compiling on: ' + host.intf.IP + ' into '+compile_dir);
		host.hasError = false;
		host.stdErr = '';
		host.stdOut = '';
		var compileDataCallback = function(host) {
		    return function(data) {
			return self.parseCompileData(host, data);
		    };
		}(host);
		var compileErrorCallback = function(host) {
		    return function(data) {
			return self.parseCompileError(host, data);
		    };
		}(host);
		return utils.executeOnHost(compile_commands, 
					   host.intf.IP, 
					   host.user, 
					   compileErrorCallback,
					   compileDataCallback,
					   self.usePTY)
		    .catch(function(err) {
			compilationFailed = true;
		    })
			.finally(function() {
			    var Convert = require('ansi-to-html');
			    var convert = new Convert();
			    // ADD STDOUT / STDERR TO RESULTS AS HIDABLE TEXT
			    var msg = '<details><summary><b>Compile STDOUT from '+host.intf.IP+':</b></summary>' +
				'<pre>' +
				'<code>'+
				convert.toHtml(host.stdOut) + 
				'</code>'+
				'</pre>' +
				'</details>';
			    self.createMessage(self.activeNode, msg, 'error');
			    msg = '<details><summary><b>Compile STDERR from '+host.intf.IP+':</b></summary>' +
				'<pre>' +
				'<code>'+
				convert.toHtml(host.stdErr) + 
				'</code>' +
				'</pre>' +
				'</details>';
			    self.createMessage(self.activeNode, msg, 'error');
			    // ADD STDOUT / STDERR TO RESULTS AS BLOBS
			    var files = {};
			    var stripANSI = require('strip-ansi');
			    files[ host.intf.IP + '.compile.stdout.txt' ] = stripANSI(host.stdOut);
			    files[ host.intf.IP + '.compile.stderr.txt' ] = stripANSI(host.stdErr);
			    var fnames = Object.keys(files);
			    var tasks = fnames.map((fname) => {
				return self.blobClient.putFile(fname, files[fname])
				    .then((hash) => {
					self.result.addArtifact(hash);
				    });
			    });
			    return Q.all(tasks);
			})
			    })
	    .then(function(output) {
		if (host.hasError || output == undefined || output.returnCode != 0)
		    compilationFailed = true;
		if (compilationFailed) {
		    throw new String('Compilation failed on ' + host.intf.IP);
		}
	    })
	    .then(function() {
		// make the local binary folder for the architecture
		mkdirp.sync(archBinPath);
		// copy the compiled binaries from remote into the local bin folder
		self.notify('info', 'copying from ' + host.intf.IP + ' into local storage.');
		return utils.copyFromHost(path.join(compile_dir, 'bin') + '/*', 
					  archBinPath + '/.',
					  host.intf.IP,
					  host.user);
	    })
            .then(function() {
		// make the local binary folder for the architecture
		mkdirp.sync(sharePath);
                // copy the message/service deserialization generated as part of the build
                return utils.copyFromHost(path.join(compile_dir, 'share') + '/*',
                                          sharePath + '/.',
                                          host.intf.IP,
                                          host.user);
            })
            .then(function() {
                // remove all folders within share/<package name>/ except msg,srv
                var fs = require('fs');
                //fs.unlinkSync();
            })
	    .then(function() {
		// remove the remote folders
		return self.cleanHost(host);
	    });
    };
    
    SoftwareGenerator.prototype.cleanHost = function(host) {
	var self = this;
	var path = require('path');
	var base_compile_dir = utils.sanitizePath(path.join(host.user.Directory, 'compilation'));
	self.notify('info', 'removing compilation artifacts off: ' + host.intf.IP);
	return utils.executeOnHost([
            'pkill catkin',
            'rm -rf ' + base_compile_dir,
        ], host.intf.IP, host.user);
    };

    SoftwareGenerator.prototype.runCompilation = function ()
    {
	var self = this;

	if (!self.compileCode || self.runningOnClient) {
	    var msg = 'Skipping compilation.';
	    self.notify('info', msg);
	    return;
	}

	return self.selectCompilationArchitectures()
	    .then(function(validHostList) {
		return self.compileBinaries(validHostList);
	    });
    };

    SoftwareGenerator.prototype.compileBinaries = function (validHostList)
    {
	var self = this;
	var selectedHosts = [];

	var path = require('path');
	var binPath = utils.sanitizePath(path.join(self.gen_dir, 'bin'));
	var child_process = require('child_process');

	// clear out any previous binaries
	child_process.execSync('rm -rf ' + binPath);

	for (var arch in validHostList) {
	    var hosts = validHostList[arch];
	    if (hosts.length) {
		selectedHosts.push(hosts[0]);
	    }
	    else {
		var msg = 'No hosts could be found for compilation on ' + arch;
		self.notify('warning', msg);
	    }
	}

	if (selectedHosts.length == 0)
	    throw new String('No hosts could be found for compilation!');

	var tasks = selectedHosts.map(function (host) {
	    var msg = 'Compiling for ' + utils.getDeviceType(host.host) + ' on ' + host.user.name + '@' + host.intf.IP;
	    self.notify('info', msg);
	    return self.compileOnHost(host);
	});
	
	return Q.all(tasks)
	    .then(function() {
		self.notify('info', 'Compiled binaries.');
	    })
	    .catch(function(err) {
		child_process.execSync('rm -rf ' + binPath);
		var tasks = selectedHosts.map(function (host) {
		    return self.cleanHost(host);
		});
		return Q.all(tasks)
		    .then(function () {
			throw new String(err);
		    });
	    });
    };
    
    SoftwareGenerator.prototype.returnSource = function() {
	var self = this;
	var artifact = self.blobClient.createArtifact(self.artifactName);
	var deferred = new Q.defer();
	artifact.addFiles(self.artifacts, function(err) {
	    if (err) {
		deferred.reject(err.message);
		return;
	    }
	    self.blobClient.saveAllArtifacts(function(err, hashes) {
		if (err) {
		    deferred.reject(err.message);
		    return;
		}
		self.result.addArtifact(hashes[0]);
		deferred.resolve();
	    });
	});
	return deferred.promise;
    };

    SoftwareGenerator.prototype.createZip = function() {
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
		    self.blobClient.putFile(self.artifactName+'.tar.gz',buf)
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

    return SoftwareGenerator;
});
