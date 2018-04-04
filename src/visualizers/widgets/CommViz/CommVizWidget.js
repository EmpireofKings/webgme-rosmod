/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Tue Sep 27 2016 23:15:32 GMT-0500 (Central Daylight Time).
 */

define([
    'cytoscape/cytoscape',
    'cytoscape-cose-bilkent/cytoscape-cose-bilkent',
    'text!./style2.css',
    'handlebars/dist/handlebars',
    'blob-util/dist/blob-util.min',
    'q',
    'css!./styles/CommVizWidget.css'], function (
	cytoscape,
	regCose,
	styleText,
	Handlebars,
        blobUtil,
	Q) {
	'use strict';

	regCose( cytoscape );
	
	var CommVizWidget,
            WIDGET_CLASS = 'comm-viz';

	CommVizWidget = function (logger, container, client) {
            this._logger = logger.fork('Widget');

            this._el = container;

            this._client = client;

            // set widget class
            this._el.addClass(WIDGET_CLASS);

	    this._el.append('<div id="cy"></div>');
	    this._cy_container = this._el.find('#cy');

            this._initialize();

            this._logger.debug('ctor finished');
	};

	CommVizWidget.prototype._initialize = function () {
            var width = this._el.width(),
		height = this._el.height(),
		self = this;
	    
            this.nodes = {};
	    this.dependencies = {
		'nodes': {},
		'edges': {}
	    };
	    this.waitingNodes = {};

	    this._cytoscape_options = {
		container: this._cy_container,
		style: styleText,
		// interaction options:
		minZoom: 1e-50,
		maxZoom: 1e50,
		zoomingEnabled: true,
		userZoomingEnabled: true,
		panningEnabled: true,
		userPanningEnabled: true,
		boxSelectionEnabled: false,
		selectionType: 'single',
		touchTapThreshold: 8,
		desktopTapThreshold: 4,
		autolock: false,
		autoungrabify: false,
		autounselectify: false,

		// rendering options:
		headless: false,
		styleEnabled: true,
		hideEdgesOnViewport: false,
		hideLabelsOnViewport: false,
		textureOnViewport: false,
		motionBlur: false,
		motionBlurOpacity: 0.2,
		wheelSensitivity: 1,
		pixelRatio: 'auto'	    
	    };

	    var self = this;

	    this._layout_options = {
		'name': 'cose-bilkent',
		// Called on `layoutready`
		ready: function () {
		    self._cy.nodes().forEach(function(node) {
			var p = node.position();
			node.data('orgPos',{
			    x: p.x,
			    y: p.y
			});
		    });
		},
		// Called on `layoutstop`
		stop: function () {
		    self._cy.nodes().forEach(function(node) {
			var p = node.position();
			node.data('orgPos',{
			    x: p.x,
			    y: p.y
			});
		    });
		},
		// Whether to fit the network view after when done
		fit: true,
		// Padding on fit
		padding: 10,
		// Whether to enable incremental mode
		randomize: true,
		// Node repulsion (non overlapping) multiplier
		nodeRepulsion: 5500, // 4500
		// Ideal edge (non nested) length
		idealEdgeLength: 100,   // 50
		// Divisor to compute edge forces
		edgeElasticity: 0.45,
		// Nesting factor (multiplier) to compute ideal edge length for nested edges
		nestingFactor: 0.1,
		// Gravity force (constant)
		gravity: 0.1,  // 0.25
		// Maximum number of iterations to perform
		numIter: 2500,
		// For enabling tiling
		tile: false,   // true
		// Type of layout animation. The option set is {'during', 'end', false}
		animate: 'end',
		// Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
		tilingPaddingVertical: 10,
		// Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
		tilingPaddingHorizontal: 10,
		// Gravity range (constant) for compounds
		gravityRangeCompound: 1.5,
		// Gravity force (constant) for compounds
		gravityCompound: 1.0,
		// Gravity range (constant)
		gravityRange: 3.8
	    };
	    this._cytoscape_options.layout = self._layout_options;
	    this._cy = cytoscape(self._cytoscape_options);

	    // copied from the wine and cheese demo
	    var infoTemplate = Handlebars.compile([
		'<p class="ac-name">{{name}}</p>',
		'<p class="ac-node-type"><i class="fa fa-info-circle"></i> {{NodeTypeFormatted}} {{#if Type}}({{Type}}){{/if}}</p>',
		'{{#if Milk}}<p class="ac-milk"><i class="fa fa-angle-double-right"></i> {{Milk}}</p>{{/if}}',
		'{{#if Country}}<p class="ac-country"><i class="fa fa-map-marker"></i> {{Country}}</p>{{/if}}',
		'<p class="ac-more"><i class="fa fa-external-link"></i> <a target="_blank" href="https://duckduckgo.com/?q={{name}}">More information</a></p>'
	    ].join(''));
	    
	    var layoutPadding = 50;
	    var layoutDuration = 500;

	    function highlight( node ){
		var nhood = node.closedNeighborhood();

		self._cy.batch(function(){
		    self._cy.elements("edge").not( nhood ).removeClass('highlighted').addClass('faded');
		    self._cy.elements('[NodeType="Component"]').not( nhood ).removeClass('highlighted').addClass('faded');
		    self._cy.elements('[NodeType="Message"]').not( nhood ).removeClass('highlighted').addClass('faded');
		    self._cy.elements('[NodeType="Service"]').not( nhood ).removeClass('highlighted').addClass('faded');
		    nhood.removeClass('faded').addClass('highlighted');
		    
		    var npos = node.position();
		    var w = window.innerWidth;
		    var h = window.innerHeight;

		    self._cy.stop().animate({
			fit: {
			    eles: self._cy.elements(),
			    padding: layoutPadding
			}
		    }, {
			duration: layoutDuration
		    }).delay( layoutDuration, function(){
			nhood.layout({
			    name: 'concentric',
			    padding: layoutPadding,
			    animate: true,
			    animationDuration: layoutDuration,
			    boundingBox: {
				x1: npos.x - w/2,
				x2: npos.x + w/2,
				y1: npos.y - w/2,
				y2: npos.y + w/2
			    },
			    fit: true,
			    concentric: function( n ){
				if( node.id() === n.id() ){
				    return 2;
				} else {
				    return 1;
				}
			    },
			    levelWidth: function(){
				return 1;
			    }
			});
		    } );
		    
		});
	    }

	    function clear(){
		self._cy.batch(function(){
		    self._cy.$('.highlighted').forEach(function(n){
			n.animate({
			    position: n.data('orgPos')
			});
		    });
		    
		    self._cy.elements().removeClass('highlighted').removeClass('faded');
		});
	    }

	    function showNodeInfo( node ){
		$('#info').html( infoTemplate( node.data() ) ).show();
	    }
	    
	    function hideNodeInfo(){
		$('#info').hide();
	    }

	    
	    self._cy.on('free', 'node', function( e ){
		var n = e.cyTarget;
		var p = n.position();
		
		n.data('orgPos', {
		    x: p.x,
		    y: p.y
		});
	    });

            self._cy.on('add', _.debounce(self.reLayout.bind(self), 250));
	    
	    self._cy.on('tap', function(){
		$('#search').blur();
	    });

	    self._cy.on('select', 'node', function(e){
		var node = this;
                if (node) {
                    var id = node.id();
		    WebGMEGlobal.State.registerActiveSelection([id]);
		    highlight( node );
		    showNodeInfo( node );
                }
	    });

	    self._cy.on('unselect', 'node', function(e){
		var node = this;

		clear();
		hideNodeInfo();
                self.onZoomClicked();
	    });

	    WebGMEGlobal.State.registerActiveSelection([]);
	};

        /* * * * * * * * Display Functions  * * * * * * * */

        function download(filename, text) {
            var element = document.createElement('a');
            var imgData = text.split(',')[1]; // after the comma is the actual image data

            blobUtil.base64StringToBlob( imgData.toString() ).then(function(blob) {
                var blobURL = blobUtil.createObjectURL(blob);

                element.setAttribute('href', blobURL);
                element.setAttribute('download', filename);
                element.style.display = 'none';

                document.body.appendChild(element);

                element.click();

                document.body.removeChild(element);
            }).catch(function(err) {
                console.log('Couldnt make blob from image!');
                console.log(err);
            });
        }

        CommVizWidget.prototype.onZoomClicked = function() {
            var self = this;
            var layoutPadding = 50;
            self._cy.fit( self._cy.elements(), layoutPadding);
        };

        CommVizWidget.prototype._addSplitPanelToolbarBtns = function(toolbarEl) {
            var self = this;

            // BUTTON EVENT HANDLERS

            var printEl = [
                '<span id="print" class="split-panel-toolbar-btn fa fa-print">',
                '</span>',
            ].join('\n');

            var zoomEl = [
                '<span id="zoom" class="split-panel-toolbar-btn fa fa-home">',
                '</span>',
            ].join('\n');

            var layoutEl = [
                '<span id="layout" class="split-panel-toolbar-btn fa fa-random">',
                '</span>',
            ].join('\n');

            var enableLoggingEl = [
                '<span id="enableLogging" class="split-panel-toolbar-btn fa fa-toggle-on">',
                '</span>',
            ].join('\n');

            var disableLoggingEl = [
                '<span id="disableLogging" class="split-panel-toolbar-btn fa fa-toggle-off">',
                '</span>',
            ].join('\n');

            toolbarEl.append(printEl);
            toolbarEl.append(zoomEl);
            toolbarEl.append(layoutEl);
            toolbarEl.append(enableLoggingEl);
            toolbarEl.append(disableLoggingEl);

            toolbarEl.find('#print').on('click', function(){
                var png = self._cy.png({
                    full: true,
                    scale: 6,
                    bg: 'white'
                });
                download( 'CommViz.png', png );
            });
            
            toolbarEl.find('#zoom').on('click', function(){
                self.onZoomClicked();
            });

            toolbarEl.find('#layout').on('click', function(){
                self.reLayout();
            });

            toolbarEl.find('#enableLogging').on('click', function(){
                self.enableLogging();
            });

            toolbarEl.find('#disableLogging').on('click', function(){
                self.disableLogging();
            });
        };

        CommVizWidget.prototype.getAllComponents = function() {
            var self = this;
            return Object.keys(self.nodes).filter(function(path) {
                var n = self.nodes[path];
                return n.type == 'Component';
            });
        };

        CommVizWidget.prototype.enableLogging = function() {
            var self = this;
            var compPaths = self.getAllComponents();

            self._client.startTransaction('Enabling logging for all components.');

            compPaths.map(function(k) {
                var id = k;
                if (self.nodes[id]) {
                    self._client.setAttribute(id, 'Logging_TraceEnable', true);
                    self._client.setAttribute(id, 'Logging_UserEnable', true);
                }
            });

            self._client.completeTransaction();            
        };

        CommVizWidget.prototype.disableLogging = function() {
            var self = this;
            var compPaths = self.getAllComponents();

            self._client.startTransaction('Disabling logging for all components.');

            compPaths.map(function(k) {
                var id = k;
                if (self.nodes[id]) {
                    self._client.setAttribute(id, 'Logging_TraceEnable', false);
                    self._client.setAttribute(id, 'Logging_UserEnable', false);
                }
            });

            self._client.completeTransaction();            
        };

	CommVizWidget.prototype.onWidgetContainerResize = function (width, height) {
	    this._cy.resize();
	};
	
	var connectionTypes = [
	    'Publisher',
	    'Subscriber',
	    'Client',
	    'Server',
	    'Action Client',
	    'Action Server'
	];

	CommVizWidget.prototype.checkDependencies = function(desc) {
	    var self = this;
            var depsMet = false;
            if (desc) {
	        // dependencies will always be either parentId (nodes & edges) or connection (edges)
	        var deps = [];
	        if (desc.parentId && !self.nodes[desc.parentId]) {
		    deps.push(desc.parentId);
	        }
	        if (desc.connection && !self.nodes[desc.connection]) {
		    deps.push(desc.connection);
	        }
	        depsMet = (deps.length == 0);
	        if (!depsMet) {
		    if (connectionTypes.indexOf(desc.type) > -1)
		        self.dependencies.edges[desc.id] = deps;
		    else
		        self.dependencies.nodes[desc.id] = deps;
	        }
            }
	    return depsMet;
	};

	CommVizWidget.prototype.updateDependencies = function() {
	    var self = this;
	    var nodePaths = Object.keys(self.dependencies.nodes);
	    var edgePaths = Object.keys(self.dependencies.edges);
	    // create any nodes whose depenencies are fulfilled now
	    nodePaths.map(function(nodePath) {
		var depPaths = self.dependencies.nodes[nodePath];
		if (depPaths && depPaths.length > 0) {
		    depPaths = depPaths.filter(function(objPath) { return self.nodes[objPath] == undefined; });
		    if (!depPaths.length) {
			var desc = self.waitingNodes[nodePath];
			self.waitingNodes[nodePath] = undefined;
			self.dependencies.nodes[nodePath] = undefined;
			self.createNode(desc);
		    }
		    else {
			self.dependencies.nodes[nodePath] = depPaths;
		    }
		}
		else {
		    self.dependencies.nodes[nodePath] = undefined;
		}
	    });
	    // Create any edges whose dependencies are fulfilled now
	    edgePaths.map(function(edgePath) {
		var depPaths = self.dependencies.edges[edgePath];
		if (depPaths && depPaths.length > 0) {
		    depPaths = depPaths.filter(function(objPath) { return self.nodes[objPath] == undefined; });
		    if (!depPaths.length) {
			var connDesc = self.waitingNodes[edgePath];
			self.waitingNodes[edgePath] = undefined;
			self.dependencies.edges[edgePath] = undefined;
			self.createEdge(connDesc);
		    }
		    else {
			self.dependencies.edges[edgePath] = depPaths;
		    }
		}
		else {
		    self.dependencies.edges[edgePath] = undefined;
		}
	    });
	};

        CommVizWidget.prototype.reLayout = function() {
            var self = this;
            self._cy.layout(self._layout_options);
        };

        CommVizWidget.prototype.getDescData = function(desc) {
            var self = this;
            var data = null;
            if (desc.isConnection) {
	        var from = self.nodes[desc.from];
	        var to   = self.nodes[desc.to];
	        if (from && to) {
		    data = {
			id: from.id + to.id,
			type: desc.type,
			interaction: desc.type,
			source: from.id,
			target: to.id
		    };
	        }
            }
            else {
		data = {
		    id: desc.id,
		    parent: desc.parentId,
		    type: desc.type,
		    NodeType: desc.type,
                    userLogging: (desc.Logging_UserEnable && !desc.Logging_TraceEnable) ? "True" : "False",
                    traceLogging: (desc.Logging_TraceEnable && !desc.Logging_UserEnable) ? "True" : "False",
                    allLogging: (desc.Loging_UserEnable && desc.Logging_TraceEnable) ? "True" : "False",
                    noLogging: (desc.Loging_UserEnable || desc.Logging_TraceEnable) ? "False" : "True",
		    name: desc.name,
		    label: desc.name,
		    orgPos: null
		};
            }
            return data;
        };

	// pub, sub, client, server are all edges
	CommVizWidget.prototype.createEdge = function(desc) {
	    var self = this;
            var data = self.getDescData( desc );
            if (data) {
		self._cy.add({
		    group: 'edges',
		    data: data
		});
		self.nodes[desc.id] = desc;
		self.updateDependencies();
	    }
	};

	// nodes are components, nodes, containers, messages, services
	CommVizWidget.prototype.createNode = function(desc) {
	    var self = this;
            var data = self.getDescData( desc );
            if (data) {
	        self._cy.add({
		    group: 'nodes',
                    data: data
	        });
	        self.nodes[desc.id] = desc;
	        self.updateDependencies();
            }
	};

	// Adding/Removing/Updating items
	CommVizWidget.prototype.addNode = function (desc) {
	    var self = this;
            if (desc && desc.type != 'Deployment') {
		var depsMet = self.checkDependencies(desc);
		// Add node to a table of nodes
		if (connectionTypes.indexOf(desc.type) > -1) {  // if this is actually an edge
		    if (depsMet) { // ready to make edge
			self.createEdge(desc);
		    }
		    else { // missing some dependencies (either parentId or connection)
			self.waitingNodes[desc.id] = desc;
		    }
		}
		else {
		    if (depsMet) { // ready to make node
			self.createNode(desc);
		    }
		    else {
			self.waitingNodes[desc.id] = desc;
		    }
		}
	    }
	};

	CommVizWidget.prototype.removeNode = function (gmeId) {
            var self = this;
            if (self._el && self.nodes) {
                var idTag = gmeId.replace(/\//gm, "\\/");
                var desc = self.nodes[gmeId];
                if (desc) {
                    if (!desc.isConnection) {
                        delete self.dependencies.nodes[gmeId];
                        self._cy.$('#'+idTag).neighborhood().forEach(function(ele) {
                            if (ele && ele.isEdge()) {
                                var edgeId = ele.data( 'id' );
                                var edgeDesc = self.nodes[edgeId];
                                self.checkDependencies(edgeDesc);
                            }
                        });
                    }
                    else {
                        delete self.dependencies.edges[gmeId];
                    }
                    delete self.nodes[gmeId];
                    delete self.waitingNodes[gmeId];
                    self._cy.remove("#" + idTag);
                    self.updateDependencies();
                }
            }
	};

	CommVizWidget.prototype.updateNode = function (desc) {
            var self = this;

            if (self._el && self.nodes && desc) {
                var oldDesc = self.nodes[desc.id];
                if (oldDesc) {
                    var idTag = desc.id.replace(/\//gm, "\\/");
                    var cyNode = self._cy.$('#'+idTag);
                    if (desc.isConnection) {
                        if (desc.src != oldDesc.src || desc.dst != oldDesc.dst) {
                            self._cy.remove('#' + idTag);
                            self.checkDependencies( desc );
                            self.updateDependencies();
                        }
                        else {
                            cyNode.data( self.getDescData(desc) );
                        }
                    }
                    else {
                        cyNode.data( self.getDescData(desc) );
                    }
                }
                self.nodes[desc.id] = desc;
            }            
	};

	/* * * * * * * * Visualizer event handlers * * * * * * * */

	CommVizWidget.prototype.onBackgroundDblClick = function () {
	};

	/* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
	CommVizWidget.prototype.destroy = function () {
            this._el.remove();
            delete this._el;
            delete this.nodes;
            this._cy.destroy();
	};

	CommVizWidget.prototype.onActivate = function () {
            //console.log('CommVizWidget has been activated');
	};

	CommVizWidget.prototype.onDeactivate = function () {
            //console.log('CommVizWidget has been deactivated');
	};

	return CommVizWidget;
    });
