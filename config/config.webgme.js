// DO NOT EDIT THIS FILE
// This file is automatically generated from the webgme-setup-tool.
'use strict';


var config = require('webgme/config/config.default'),
    validateConfig = require('webgme/config/validator');

// The paths can be loaded from the webgme-setup.json
config.plugin.basePaths.push(__dirname + '/../src/plugins');
config.visualization.layout.basePaths.push(__dirname + '/../src/layouts');
config.visualization.decoratorPaths.push(__dirname + '/../src/decorators');

config.addOn.enable = true;

config.visualization.panelPaths.push(__dirname + '/../node_modules/webgme-breadcrumbheader/src/visualizers/panels');
config.visualization.panelPaths.push(__dirname + '/../node_modules/webgme-fab/src/visualizers/panels');
config.visualization.panelPaths.push(__dirname + '/../node_modules/webgme-codeeditor/src/visualizers/panels');
config.visualization.panelPaths.push(__dirname + '/../src/visualizers/panels');




// Visualizer descriptors
config.visualization.visualizerDescriptors.push(__dirname + '/../src/visualizers/Visualizers.json');
// Add requirejs paths
config.requirejsPaths = {
  'CodeEditor': 'panels/CodeEditor/CodeEditorPanel',
  'FloatingActionButton': 'panels/FloatingActionButton/FloatingActionButtonPanel',
  'BreadcrumbHeader': 'panels/BreadcrumbHeader/BreadcrumbHeaderPanel',
  'panels': './src/visualizers/panels',
  'widgets': './src/visualizers/widgets',
  'panels/CodeEditor': './node_modules/webgme-codeeditor/src/visualizers/panels/CodeEditor',
  'widgets/CodeEditor': './node_modules/webgme-codeeditor/src/visualizers/widgets/CodeEditor',
  'panels/FloatingActionButton': './node_modules/webgme-fab/src/visualizers/panels/FloatingActionButton',
  'widgets/FloatingActionButton': './node_modules/webgme-fab/src/visualizers/widgets/FloatingActionButton',
  'panels/BreadcrumbHeader': './node_modules/webgme-breadcrumbheader/src/visualizers/panels/BreadcrumbHeader',
  'widgets/BreadcrumbHeader': './node_modules/webgme-breadcrumbheader/'
};

config.visualization.layout.default = 'NewDefaultLayout';
config.mongo.uri = 'mongodb://127.0.0.1:27017/rosmod';
validateConfig(config);
module.exports = config;
