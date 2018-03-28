/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 0.1.0 from webgme on Wed Apr 06 2016 14:15:27 GMT-0500 (CDT).
 */

define([
    'text!./Plot.html',
    'blob/BlobClient',
    './ResultsVizWidget.Parser',
    './ResultsVizWidget.UserParser',
    './ResultsVizWidget.Plotter',
    'plotly-js/plotly.min',
    'select2/js/select2.min',
    'd3',
    'q',
    'css!select2/css/select2.min.css',
    'css!./styles/ResultsVizWidget.css'
], function (
    PlotHtml,
    BlobClient,
    Parser,
    UserParser,
    Plotter,
    Plotly,
    select2,
    d3,
    Q) {

    var ResultsVizWidget,
	WIDGET_CLASS = 'results-viz';

    ResultsVizWidget = function (options) {
        this._logger = options.logger.fork('Widget');

        this._el = options.container;

	this._blobClient = new BlobClient({logger: options.logger.fork('BlobClient')});
	this._client = options.client;

        this._initialize();

        this._logger.debug('ctor finished');
    };

    ResultsVizWidget.prototype._initialize = function () {
        var width = this._el.width(),
            height = this._el.height(),
            self = this;

	// data we need
        this.nodes = {};
	this.activeId = null;
	this.datas = {};
	this.logs = {};
	this.timeBeginEnd = {
	    begin: -1,
	    end: -1
	};

        // set widget class
        this._el.addClass(WIDGET_CLASS);

	// setup the html
	this._el.append(PlotHtml);
		    
	this._controls = $(this._el).find('#controls').first();
	this._plotSelectors = $(this._controls).find('#plotSelectors').first();
	$(this._plotSelectors).select2();
	this._plotContainer = $(this._el).find('#plot-div').first();

	// checkbox for shared axes
	Plotter.sharedX = true;
        this.sharedXAxes_toggle = this._el.find("#cbSharedX").first();
        $(this.sharedXAxes_toggle).prop('checked', Plotter.sharedX);
        this.sharedXAxes_toggle.on('change', this.togglePlot.bind(this, 'sharedX'));

	Plotter.sharedY = false;
        this.sharedYAxes_toggle = this._el.find("#cbSharedY").first();
        $(this.sharedYAxes_toggle).prop('checked', Plotter.sharedY);
        this.sharedYAxes_toggle.on('change', this.togglePlot.bind(this, 'sharedY'));

	// checkbox for legend
	Plotter.legendInPlot = false;
	this.legednInPlot_toggle = this._el.find("#cbLegendInPlot").first();
	$(this.legednInPlot_toggle).prop('checked', Plotter.legendInPlot);
        this.legednInPlot_toggle.on('change', this.togglePlot.bind(this, 'legendInPlot'));
    };

    // built-in toggles 
    ResultsVizWidget.prototype.togglePlot = function(key, event) {
        var self=this;
        var toggle = event.target;
        var checked = toggle.checked;

	Plotter[key] = checked;
        var id = Object.keys(self.nodes)[0];
        self.plotLogs();
    };

    ResultsVizWidget.prototype.onLogToggled = function(event) {
	var self = this;
	// set all to false
	Object.keys(self.logs).map((logName) => {
	    self.logs[logName].enabled = false;
	});
	// now set the selected ones to true
	var selectedLogs = $(self._plotSelectors).select2("data");
	selectedLogs.map((log) => {
	    var logName = log.text;
	    self.logs[logName].enabled = true;
	});
	// update the plot
	self.plotLogs();
    };

    ResultsVizWidget.prototype.clearLogToggles = function() {
	var self = this;
	if (self._plotSelectors) {
	    self._plotSelectors.empty();
	}
    };

    ResultsVizWidget.prototype.makeLogControls = function() {
	var self = this;
	Object.keys(self.logs).sort().map((logName) => {
	    var key = logName.replace(/\./g, '_');
	    self._plotSelectors.append(`<option selected="selected" value="${key}">${logName}</option>`);
	});
	self._plotSelectors.on('change', self.onLogToggled.bind(self));
    };

    ResultsVizWidget.prototype.loadNodeData = function (desc) {
	var self = this;

	// reset begin / end times
	self.timeBeginEnd = {
	    begin: -1,
	    end: -1
	};
	self.datas = {};
	self.logs = {};

	// clear out log toggles
	self.clearLogToggles();

	var attributes = desc.attributes.concat(desc.userLogs);
	var tasks = attributes.map((key) => {
	    var a = key;
	    // load the attribute
	    var nodeObj = self._client.getNode(desc.id);
	    var logHash = nodeObj.getAttribute(a);
	    var logName = a;
	    if (logHash) {
		// get the name of the file <node>.<comp>.<user/trace>.log
		return self._blobClient.getMetadata(logHash)
		    .then((metadata) => {
			// save the name
			logName = metadata.name;
			// now get the log data
			return self._blobClient.getObjectAsString(logHash)
		    })
		    .then((data) => {
			var parsed = {};
			// parse the logs
			if (logName.indexOf('.trace.log') > -1) {
			    parsed = Parser.getDataFromAttribute(data);
			} else {
			    parsed = UserParser.getDataFromAttribute(data);
			}

			// figure out time range
			if (!_.isEmpty(parsed)) {
			    self.logs[logName] = {
				data:    parsed,
				logName: logName,
				logHash: logHash,
				enabled: true,
			    };

			    var logTimeRange = UserParser.getTimeBeginEnd( self.logs[logName].data );
			    if (self.timeBeginEnd.begin == -1 ||
				self.timeBeginEnd.begin > logTimeRange.begin) {
				self.timeBeginEnd.begin = logTimeRange.begin;
			    }
			    if (self.timeBeginEnd.end == -1 ||
				self.timeBeginEnd.end < logTimeRange.end) {
				self.timeBeginEnd.end = logTimeRange.end;
			    }
			}
		    });
	    }
	});
	return Q.allSettled(tasks)
	    .then(function() {
		return self.makeLogControls();
	    });
    };

    ResultsVizWidget.prototype.plotLogs = function () {
	var self = this;

	self.clearPlot();

	// logs sorted by name and with disabled logs removed
	var sortedLogs = Object.keys(self.logs).sort().filter((logKey) => {
	    return self.logs[logKey].enabled;
	});

	// data from the sorted & enabled logs
	var sortedDatas = sortedLogs.map((logKey) => {
	    return self.logs[logKey].data;
	});

	Plotter.plotData(self._plotContainer, 'plot', sortedDatas, self._onClick.bind(self, self.activeId) );
    };

    // Adding/Removing/Updating items
    ResultsVizWidget.prototype.addNode = function (desc) {
	var self = this;
        if (desc && !self.nodes[desc.id]) {
	    self.nodes[desc.id] = desc;
	    self.activeId = desc.id;
	    self.loadNodeData(desc)
		.then(function() {
		    self.plotLogs();
		});
        }
    };

    ResultsVizWidget.prototype.removeNode = function (gmeId) {
        var desc = this.nodes[gmeId];
	if (desc) { // if this is our results object
	    this.clearNodes();
	}
    };

    ResultsVizWidget.prototype.updateNode = function (desc) {
	if (this.nodes[desc.id]) { // if this is our results object
	    // remove old data
	    this.clearNodes();
	    // recreate with new data
	    this.addNode(desc);
        }
    };

    ResultsVizWidget.prototype._onClick = function (id) {
	this.onActivate();
	WebGMEGlobal.State.registerActiveSelection([id]);
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */

    ResultsVizWidget.prototype.onBackgroundDblClick = function () {
    };

    ResultsVizWidget.prototype.onWidgetContainerResize = function (width, height) {
        //console.log('Widget is resizing...');
	var self = this;
	if (self._el) {
	    var p = d3.selectAll(self._el).select('#plot')
	    if (p) {
		var n = p.node();
		if (n && Plotly.Plots && Plotly.Plots.resize) {
		    Plotly.Plots.resize(n);
		}
	    }
	}
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    ResultsVizWidget.prototype._addSplitPanelToolbarBtns = function(toolbarEl) {
        var self = this;
    };

    ResultsVizWidget.prototype.clearPlot = function() {
	if (this._plotContainer) {
	    this._plotContainer.empty();
	    this._plotContainer.append('<div id="plot"></div>');
	    this._plotEl = $(this._plotContainer).find('#plot').first();
	}
    };

    ResultsVizWidget.prototype.clearNodes = function() {
        if (this._plotEl) {
            this._plotEl.empty();
        }
	if (this._plotSelectors) {
	    this._plotSelectors.empty();
	}
        delete this.nodes;
        this.nodes = {};
    };

    ResultsVizWidget.prototype.shutdown = function() {
        if (this._el) {
            this._el.remove();
            delete this._el;
        }
    };
        
    ResultsVizWidget.prototype.destroy = function () {
        this.clearNodes();
        this.shutdown();
    };

    ResultsVizWidget.prototype.onActivate = function () {
    };

    ResultsVizWidget.prototype.onDeactivate = function () {
    };

    return ResultsVizWidget;
});
