/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by AddOnGenerator 1.0.0 from webgme on Wed Mar 02 2016 22:18:21 GMT-0600 (Central Standard Time).
 */

define([
    'addon/AddOnBase'
], function (AddOnBase) {
    'use strict';

    /**
     * Initializes a new instance of ExperimentMonitor.
     * @class
     * @augments {AddOnBase}
     * @classdesc This class represents the addOn ExperimentMonitor.
     * @constructor
     */
    var ExperimentMonitor = function (mainLogger, gmeConfig) {
        // Call base class' constructor.
        AddOnBase.call(this, mainLogger, gmeConfig);
    };

    // Prototypal inheritance from AddOnBase.
    ExperimentMonitor.prototype = Object.create(AddOnBase.prototype);
    ExperimentMonitor.prototype.constructor = ExperimentMonitor;

    /**
     * Gets the name of the ExperimentMonitor.
     * @returns {string} The name of the AddOn.
     * @public
     */
    ExperimentMonitor.prototype.getName = function () {
        return 'ExperimentMonitor';
    };

    /**
     * Gets the semantic version (semver.org) of the ExperimentMonitor.
     * @returns {string} The version of the AddOn.
     * @public
     */
    ExperimentMonitor.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * This is invoked each time changes in the branch of the project are done. AddOns are allowed to make changes on
     * an update, but should not persist by themselves. (The AddOnManager will persist after each addOn has had its way
     * ordered by the usedAddOn registry in the rootNode).
     * Before each invocation a new updateResult is created which should be returned in the callback. There is no need
     * for the AddOn to report if it made changes or not, the monitor/manager will always persist and if there are no
     * changed objects - it won't commit to the storage.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     */
    ExperimentMonitor.prototype.update = function (rootNode, commitObj, callback) {
        callback(null, this.updateResult);
    };

    /**
     * Called once when the addOn is started for the first time.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult} callback
     */
    ExperimentMonitor.prototype.initialize = function (rootNode, commitObj, callback) {
        this.logger.info('ExperimentMonitor got initialized at commitHash', commitObj._id);

        this.update(rootNode, commitObj, callback);
    };

    return ExperimentMonitor;
});
