import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import {Meteor} from 'meteor/meteor'
import {Template} from 'meteor/templating'

let FlowTransition = {
  transitionStore: {},
  _sections: {}
};

let _ready = false;

/**
 * The animations will be registered like usual velocity animations, using
 * a two part array:
 *    {translateX: [0, -10]}, {easing: "spring", duration: 325}
 *  -or use a VelocityUI animation:
 *    "transition.fadeIn", {delay: 400, duration: 325}
 *  -or- use an built in txFull screen traversal:
 *     "down", {easing: "spring", duration: 325}
 * You can use a txFull screen option "down", which refers to the direction
 * of travel of the template. It can be moving: down, up, left, or right
 */

Template.section.onRendered = function() {
  const section = this.data.name;
  FlowTransition._sections[section] = document.getElementById(section);
};

function _setUiHooks(parentElement, transitions) {
  if (!parentElement) return
  let uiHooks = {};

  if (transitions) {

    if (transitions.txIn) {
      uiHooks.insertElement = function(node) {
        const _tx = transitions.txIn;

        // set up the hooks to apply properties before insertion
        _.each(_tx.hook, function(value, property) {
          $.Velocity.hook(node, property, value);
        });

        // insert the new element
        $(node).prependTo(parentElement);

        // start the animation when the DOM is ready
        Meteor.defer(function() {
          $(node).velocity(_tx);
        });
      };
    }

    if (transitions.txOut) {
      uiHooks.removeElement = function(node) {
        let _tx = transitions.txOut;

        // callback = node.remove + user defined callback
        _tx.options = _tx.options || {};
        _tx.options.complete = (function(complete) {

          return function() {
            if (complete) {
              complete.apply(complete, arguments);
            }
            $(node).remove();
          };

        })(_tx.options.complete);

        // set up the hooks to apply properties before insertion
        _.each(_tx.hook, function(value, property) {
          $.Velocity.hook(node, property, value);
        });

        // start the animation when the DOM is ready
        Meteor.defer(function() {
          $(node).velocity(_tx);
        });
      };
    }
  }

  parentElement._uihooks = uiHooks;
}

function _attachDeepObject() {
  let missingKey = false;

  _.reduce(arguments, function(mem, key) {
    if (!key) missingKey = true;
    return mem = mem[key] = mem[key] || {};
  }, this);

  return !missingKey;
}

function _attachFullPageAnimations() {
  let _txName, _options, _property, _value, _valueOpposite;

  // can either be a string name, or an object in the form {properties: {}, options: {}}
  this.txFull = (typeof this.txFull === 'string') ? {properties: this.txFull} : this.txFull;
//  if (typeof this.txFull === 'string') {
//    this.txFull = [this.txFull];
//  }
  _txName = this.txFull.properties;
  _options = this.txFull.options || {
    duration: 350,
    easing: 'ease-out',
    queue: false
  };

  // ensure that a valid full page transition is being requested
  if (_.indexOf(['down', 'up', 'left', 'right'], _txName) === -1) {
    console.log("'" + _txName + "' is not a registered txFull page transition");
    return;
  }

  // get the property and value for the animation
  _property = (_txName === 'down' || _txName === 'up') ? 'translateY' : 'translateX';
  _value = (_txName === 'down' || _txName === 'right') ? '-100%' : '100%';
  _valueOpposite = (_txName === 'down' || _txName === 'right') ? '100%' : '-100%';

  // attach the txIn and txOut objects
  this.txOut = {properties: {} };
  this.txIn = {pre: {}, properties: {}, hooks: {}};

  this.txIn.hooks[_property] = _value;
  this.txIn.properties[_property] = [0, _value];

  this.txOut.properties[_property] = [_valueOpposite, 0];
  this.txOut.options = this.txIn.options = _options;
}

// FlowTransition.transitionStore holds objects in the form:
//    [section][newRoute][oldRoute][txDirection]{ TRANSITION OBJECT }
FlowTransition.addTransition = function(transition) {
  let _tx = transition;
  let _fts = FlowTransition.transitionStore;

  let attached = _attachDeepObject.apply(_fts, [_tx.section, _tx.to, _tx.from]);
  if (!attached) {
    console.log("A FlowTransition transition object must have the parameters:" +
            " section, from, to; and should have the parameters: txFull or txIn & txOut.");
  }

  if (_tx.txFull) {
    _attachFullPageAnimations.call(_tx);
  }
  if (_tx.txIn) {
    let _txIn = (typeof _tx.txIn === 'string') ? {properties: _tx.txIn} : _tx.txIn;
    _fts[_tx.section][_tx.to][_tx.from].txIn = _txIn;
  }
  if (_tx.txOut) {
    let _txOut = (typeof _tx.txOut === 'string') ? {properties: _tx.txOut} : _tx.txOut;
    _fts[_tx.section][_tx.to][_tx.from].txOut = _txOut;
  }
};

FlowTransition.applyTransitions = function(newRoute, oldRoute) {
  let _fts = FlowTransition.transitionStore;
  let hasTransition = {};

  _.each(FlowTransition._sections, function(parentElement, section) {

    // get the transition object or set it to null
    const transitions = oldRoute && _fts[section] && _fts[section][newRoute] && _fts[section][newRoute][oldRoute] &&
      _fts[section][newRoute][oldRoute];
    hasTransition[section] = !!transitions;

    // when transitions is null, stale _uihooks will be removed from the parentElement
    _setUiHooks(parentElement, transitions);
  });

  // let the caller know which sections have transitions
  return hasTransition;
};

/**
 * This is the function to call externally to kick off a layout render.
 *
 * arguments = are in the form:
 * [{section1: contentTemplateName2}, {section2: contentTemplateName2}, ...]
 */
FlowTransition.flow = function() {
  let layoutAssignment = arguments;

  if (!_ready) { // make sure the initial Template sections are loaded
    Meteor.defer(function() {
      _ready = true;
      FlowTransition.flow.apply(this, layoutAssignment);
    });
    return;
  }

  const _newLayout = _.extend.apply(null, layoutAssignment);

  const flowCurrent = FlowRouter.current();
  const newRoute = flowCurrent.route.name;
  const oldRoute = flowCurrent.oldRoute ? flowCurrent.oldRoute.name : null;
  const hasTransition = FlowTransition.applyTransitions(newRoute, oldRoute);

  _.each(FlowTransition._sections, function(parentElement, section) {
    const oldNode = parentElement.firstElementChild;
    if (!_newLayout[section]) {
      if (oldNode) {
        Blaze.remove(Blaze.getView(oldNode));
      }
    }
    else {
      const newContent = Template[_newLayout[section]];
      const sameContent = (oldNode && (Blaze.getView(oldNode).name === newContent.viewName));
      if (!sameContent || hasTransition[section]) {
        Blaze.render(newContent, parentElement);
        if (oldNode) {
          Blaze.remove(Blaze.getView(oldNode));
        }
      }
    }
  });
};
