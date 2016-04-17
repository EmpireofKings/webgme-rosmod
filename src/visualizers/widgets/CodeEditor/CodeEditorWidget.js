/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Sat Apr 16 2016 08:51:41 GMT-0700 (PDT).
 */

define([
    // HTML
    'text!./CodeEditor.html',
    // Codemirror
    'rosmod/Libs/cm/lib/codemirror', 
    // Syntax highlighting
    'rosmod/Libs/cm/mode/clike/clike',
    'rosmod/Libs/cm/mode/markdown/markdown',
    // Keymaps
    'rosmod/Libs/cm/keymap/emacs', 
    'rosmod/Libs/cm/keymap/sublime',
    'rosmod/Libs/cm/keymap/vim',
    // Addons 
    'rosmod/Libs/cm/addon/hint/show-hint',
    'rosmod/Libs/cm/addon/search/search',
    'rosmod/Libs/cm/addon/search/searchcursor',
    'rosmod/Libs/cm/addon/search/matchesonscrollbar',
    'rosmod/Libs/cm/addon/search/match-highlighter',
    'rosmod/Libs/cm/addon/search/jump-to-line',
    'rosmod/Libs/cm/addon/scroll/annotatescrollbar',
    'rosmod/Libs/cm/addon/dialog/dialog',
    'rosmod/Libs/cm/addon/display/fullscreen',
    'rosmod/Libs/cm/addon/fold/foldcode',
    'rosmod/Libs/cm/addon/fold/foldgutter',
    'rosmod/Libs/cm/addon/fold/brace-fold',
    'rosmod/Libs/cm/addon/fold/xml-fold',
    'rosmod/Libs/cm/addon/fold/markdown-fold',
    'rosmod/Libs/cm/addon/fold/comment-fold',
    // CSS
    'css!./styles/CodeEditorWidget.css',
    'css!rosmod/Libs/cm/addon/hint/show-hint.css',
    'css!rosmod/Libs/cm/addon/search/matchesonscrollbar.css',
    'css!rosmod/Libs/cm/addon/dialog/dialog.css',
    'css!rosmod/Libs/cm/addon/display/fullscreen.css',
    'css!rosmod/Libs/cm/theme/night.css',
    'css!rosmod/Libs/cm/lib/codemirror.css',
    'css!rosmod/Libs/cm/theme/3024-day.css',
    'css!rosmod/Libs/cm/theme/3024-night.css',
    'css!rosmod/Libs/cm/theme/abcdef.css',
    'css!rosmod/Libs/cm/theme/ambiance.css',
    'css!rosmod/Libs/cm/theme/base16-dark.css',
    'css!rosmod/Libs/cm/theme/bespin.css',
    'css!rosmod/Libs/cm/theme/base16-light.css',
    'css!rosmod/Libs/cm/theme/blackboard.css',
    'css!rosmod/Libs/cm/theme/cobalt.css',
    'css!rosmod/Libs/cm/theme/colorforth.css',
    'css!rosmod/Libs/cm/theme/dracula.css',
    'css!rosmod/Libs/cm/theme/eclipse.css',
    'css!rosmod/Libs/cm/theme/elegant.css',
    'css!rosmod/Libs/cm/theme/erlang-dark.css',
    'css!rosmod/Libs/cm/theme/hopscotch.css',
    'css!rosmod/Libs/cm/theme/icecoder.css',
    'css!rosmod/Libs/cm/theme/isotope.css',
    'css!rosmod/Libs/cm/theme/lesser-dark.css',
    'css!rosmod/Libs/cm/theme/liquibyte.css',
    'css!rosmod/Libs/cm/theme/material.css',
    'css!rosmod/Libs/cm/theme/mbo.css',
    'css!rosmod/Libs/cm/theme/mdn-like.css',
    'css!rosmod/Libs/cm/theme/midnight.css',
    'css!rosmod/Libs/cm/theme/monokai.css',
    'css!rosmod/Libs/cm/theme/neat.css',
    'css!rosmod/Libs/cm/theme/neo.css',
    'css!rosmod/Libs/cm/theme/night.css',
    'css!rosmod/Libs/cm/theme/paraiso-dark.css',
    'css!rosmod/Libs/cm/theme/paraiso-light.css',
    'css!rosmod/Libs/cm/theme/pastel-on-dark.css',
    'css!rosmod/Libs/cm/theme/railscasts.css',
    'css!rosmod/Libs/cm/theme/rubyblue.css',
    'css!rosmod/Libs/cm/theme/seti.css',
    'css!rosmod/Libs/cm/theme/solarized.css',
    'css!rosmod/Libs/cm/theme/the-matrix.css',
    'css!rosmod/Libs/cm/theme/tomorrow-night-bright.css',
    'css!rosmod/Libs/cm/theme/tomorrow-night-eighties.css',
    'css!rosmod/Libs/cm/theme/ttcn.css',
    'css!rosmod/Libs/cm/theme/twilight.css',
    'css!rosmod/Libs/cm/theme/vibrant-ink.css',
    'css!rosmod/Libs/cm/theme/xq-dark.css',
    'css!rosmod/Libs/cm/theme/xq-light.css',
    'css!rosmod/Libs/cm/theme/yeti.css',
    'css!rosmod/Libs/cm/theme/zenburn.css',
    'css!rosmod/Libs/cm/addon/fold/foldgutter'
], function (
    CodeEditorHtml,
    CodeMirror,
    // Syntax Highlighting
    CodeMirrorModeClike,
    CodeMirrorModeMarkdown,
    // Keymaps
    CodeMirrorEmacsKeymap,
    CodeMirrorSublimeKeymap,
    CodeMirrorVimKeymap,
    // Addons
    CodeMirrorShowHint,
    CodeMirrorSearch,
    CodeMirrorSearchCursor,
    CodeMirrorMatchesOnScrollbar,
    CodeMirrorMatchHighlighter,
    CodeMirrorJumpToLine,
    CodeMirrorAnnotateScrollbar,
    CodeMirrorDialog,
    CodeMirrorFullScreen, 
    CodeMirrorFoldCode, 
    CodeMirrorFoldGutter,
    CodeMirrorBraceFold, 
    CodeMirrorXMLFold, 
    CodeMirrorMarkdownFold, 
    CodeMirrorCommentFold) {
    'use strict';

    var CodeEditorWidget,
    WIDGET_CLASS = 'code-editor',
    cmPercent = '94%';

    CodeEditorWidget = function (logger, container, client) {
        this._logger = logger.fork('Widget');
	this._client = client;
        this._el = container;

	$(this._el).css({
	    'padding': '0'
	});

        this.nodes = {};
        this._initialize();

        this._logger.debug('ctor finished');
    };

    CodeEditorWidget.prototype._initialize = function () {
        var width = this._el.width(),
        height = this._el.height(),
        self = this;

        // set widget class
        //this._el.addClass(WIDGET_CLASS);

        // Create the CodeEditor and options
	this._readOnly = this._client.isProjectReadOnly();
	this._fullscreen = false;
        this._el.append(CodeEditorHtml);
	this._container = this._el.find('#CODE_EDITOR_DIV').first();
	this._codearea = this._el.find('#codearea').first();
	this._title = this._el.find('#code_editor_title');
	this.selectedAttribute = '';
	this.selectedNode = '';

	var mac = CodeMirror.keyMap.default == CodeMirror.keyMap.macDefault;
	CodeMirror.keyMap.default[(mac ? "Cmd" : "Ctrl") + "-Space"] = "autocomplete";
	CodeMirror.keyMap.sublime[(mac ? "Cmd" : "Ctrl") + "-Space"] = "autocomplete";
	CodeMirror.keyMap.emacs[(mac ? "Cmd" : "Ctrl") + "-Space"] = "autocomplete";
	CodeMirror.keyMap.vim[(mac ? "Cmd" : "Ctrl") + "-Space"] = "autocomplete";

	var CodeMirrorEditorOptions = {
	    readOnly: this._readOnly,
	    lineNumbers: true,
	    matchBrackets: true,
	    //viewPortMargin: Infinity,
	    keyMap: 'sublime',
	    path: 'rosmod/Libs/cm/lib/',
	    theme: 'default',
	    fullscreen: false,
	    foldGutter: true,
	    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
	};
	this.editor = new CodeMirror.fromTextArea(
	    this._codearea.get(0),
	    CodeMirrorEditorOptions
	);

	this.editor.on(
	    'changes', 
	    _.debounce(this.saveChanges.bind(this), 250) // make sure this doesn't fire more than every 250 ms
	);

	var self=this;
	this.editor.setOption("extraKeys", {
	    'F11': function(cm) {
		//cm.setOption('fullScreen', !cm.getOption('fullScreen'));
		self.fullScreen(!self._fullScreen);
	    },
	    'Esc': function(cm) {
		//cm.setOption('fullScreen', false);
		self.fullScreen(false);
	    },
	    "Ctrl-Q": function(cm){ 
		cm.foldCode(cm.getCursor()); 
	    }
	});

	this.editor.foldCode(CodeMirror.Pos(0, 0));
	// THEME SELECT
	this.theme_select = this._el.find("#theme_select").first();
	this.theme_select.on('change', this.selectTheme.bind(this));

	// KEY MAP SELECTION
	this.kb_select = this._el.find("#kb_select").first();
	this.kb_select.on('change', this.selectKeyBinding.bind(this));

	this.buffer_select = this._el.find("#buffer_select").first();
	this.buffer_select.on('change', this.selectBuffer.bind(this));

	this.text = '';
	this.docs = {};
	$('.CodeMirror').css({
	    height: cmPercent
	});
    };

    CodeEditorWidget.prototype.fullScreen = function(toFullScreen) {
	if (toFullScreen) {
	    var container = $(document).find('#CODE_EDITOR_DIV').first();
	    $(container).css({
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100%',
		height: '100%'
	    });
	    $(container).zIndex(9999);
	    $(container).appendTo(document.body);
	    $('.CodeMirror').css({
		height: cmPercent
	    });
	    this.editor.focus();
	    this._fullScreen = true;
	}
	else {
	    var container = $(document).find('#CODE_EDITOR_DIV').first();
	    $(container).css({
		position: '',
		top: '',
		left: '',
		width: '100%',
		height: '100%'
	    });
	    $(container).zIndex('auto');
	    $(container).appendTo(this._el);
	    $('.CodeMirror').css({
		height: cmPercent
	    });
	    this.editor.focus();
	    this._fullScreen = false;
	}
	this.editor.refresh();
    };

    CodeEditorWidget.prototype.saveChanges = function(cm, changes) {
	try {
	    this._client.setAttributes(this.selectedNode, this.selectedAttribute, cm.getValue());
	}
	catch (e) {
	    this._logger.error('Saving META failed!');
	}
    };

    CodeEditorWidget.prototype.updateText = function(newText) {
	this.text = newText;
    };

    CodeEditorWidget.prototype.selectBuffer = function(event) {
	var buffer_select = event.target;
	var newAttribute = buffer_select.options[buffer_select.selectedIndex].textContent;
	if (newAttribute) {
	    var newDoc = this.docs[newAttribute];
	    this.docs[this.selectedAttribute] = this.editor.swapDoc(newDoc);
	    this.selectedAttribute = newAttribute;
	    this.editor.refresh();
	}
    };

    CodeEditorWidget.prototype.selectTheme = function(event) {
	var theme_select = event.target;
	var theme = theme_select.options[theme_select.selectedIndex].textContent;
	this.editor.setOption("theme", theme);
    };

    CodeEditorWidget.prototype.selectKeyBinding = function(event) {
	var kb_select = event.target;
	var binding = kb_select.options[kb_select.selectedIndex].textContent;
	this.editor.setOption("keyMap", binding);
    };

    CodeEditorWidget.prototype.onWidgetContainerResize = function (width, height) {
        console.log('Widget is resizing...');
    };

    // Adding/Removing/Updating items
    CodeEditorWidget.prototype.addNode = function (desc) {
	var self = this;
        if (desc) {
	    $(self._title).append(desc.name);
	    var attributeNames = Object.keys(desc.codeAttributes);
	    if (attributeNames.length > 0) {
		self.nodes[desc.id] = desc;
		self.selectedNode = desc.id;
		attributeNames.map(function(attributeName) {
		    // add the attributes to buffers
		    self.docs[attributeName] = new CodeMirror.Doc(desc.codeAttributes[attributeName].value, 
								  desc.codeAttributes[attributeName].mode);
		    $(self.buffer_select).append(new Option(attributeName, attributeName));
		});
		// select the first attribute?
		self.selectedAttribute = attributeNames[0];
		self.editor.swapDoc(self.docs[self.selectedAttribute]);
		self.editor.refresh();
	    }
        }
    };

    CodeEditorWidget.prototype.removeNode = function (gmeId) {
        var desc = this.nodes[gmeId];
	// NEED TO MAKE SURE I HANDLE REMOVE NODE HERE
        delete this.nodes[gmeId];
    };

    CodeEditorWidget.prototype.updateNode = function (desc) {
        if (desc) {
            // console.log('Updating node:', desc);
	    // NEED TO UPDATE THE ATTRIBUTES HERE!
        }
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    CodeEditorWidget.prototype.onNodeClick = function (id) {
        // This currently changes the active node to the given id and
        // this is overridden in the controller.
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    CodeEditorWidget.prototype.destroy = function () {
    };

    CodeEditorWidget.prototype.onActivate = function () {
        console.log('CodeEditorWidget has been activated');
    };

    CodeEditorWidget.prototype.onDeactivate = function () {
        console.log('CodeEditorWidget has been deactivated');
    };

    return CodeEditorWidget;
});
