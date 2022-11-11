import {Meteor} from 'meteor/meteor'
import {Template} from 'meteor/templating'
import {Blaze} from "meteor/blaze";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
//import './section.html'

class Flow {
  constructor() {
    this._transitionStore = {}
    this._sections = {}
    this._ready = false
    const localSection = this._sections
    console.log('CAZZO CI SONO')

    Template.section = new Template('section', function () {});
    Template.section.onRendered(function () {
      const section = this.data.name;
      console.log('CAZZO CI SONO Template', section)
      localSection[section] = document.getElementById(section);
    });
  }

  _setUiHooks(parentElement, transitions) {
    console.log('CAZZO SETUI')
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

  _attachDeepObject() {
    let missingKey = false;

    _.reduce(arguments, function(mem, key) {
      if (!key) missingKey = true;
      return mem = mem[key] = mem[key] || {};
    }, this);

    return !missingKey;
  }

  _attachFullPageAnimations() {
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

  addTransition (transition) {
    console.log('Add Transition', transition)
    let _tx = transition;
    let _fts = this._transitionStore;

    let attached = this._attachDeepObject.apply(_fts, [_tx.section, _tx.to, _tx.from]);
    if (!attached) {
      console.log("A FlowTransition transition object must have the parameters:" +
        " section, from, to; and should have the parameters: txFull or txIn & txOut.");
    }

    if (_tx.txFull) {
      this._attachFullPageAnimations.call(_tx);
    }
    if (_tx.txIn) {
      let _txIn = (typeof _tx.txIn === 'string') ? {properties: _tx.txIn} : _tx.txIn;
      _fts[_tx.section][_tx.to][_tx.from].txIn = _txIn;
    }
    if (_tx.txOut) {
      let _txOut = (typeof _tx.txOut === 'string') ? {properties: _tx.txOut} : _tx.txOut;
      _fts[_tx.section][_tx.to][_tx.from].txOut = _txOut;
    }
  }

  applyTransitions (newRoute, oldRoute) {
    console.log('apply transition', newRoute, oldRoute)
    let _fts = this._transitionStore;
    console.log('apply transition', _fts)

    let hasTransition = {};
    const setUiHooks = (parentElement, transition) => this._setUiHooks(parentElement, transition)
    console.log('apply transition', setUiHooks)
    console.log('test', this._sections)
    _.each(this._sections, function(parentElement, section) {
      console.log("seciotn", section)
      // get the transition object or set it to null
      const transitions = oldRoute && _fts[section] && _fts[section][newRoute] && _fts[section][newRoute][oldRoute] &&
        _fts[section][newRoute][oldRoute];
      hasTransition[section] = !!transitions;

      // when transitions is null, stale _uihooks will be removed from the parentElement
      setUiHooks(parentElement, transitions);
    });
    console.log("ciao has transition", hasTransition)
    // let the caller know which sections have transitions
    return hasTransition;
  }

  flow(routerTo) {
    const self = this

    let layoutAssignment = arguments;
    if (!this._ready) { // make sure the initial Template sections are loaded
      Meteor.defer(function() {
        self._ready = true;
        self.flow(this, layoutAssignment);
      });
      return;
    }
    console.log("routerTo",  routerTo)
    console.log("layout", layoutAssignment)

    const cazzo = layoutAssignment[1]
    console.log(cazzo)

    const _newLayout = _.extend({}, cazzo[0]);

    const flowCurrent = FlowRouter.current();
    const newRoute = flowCurrent.route.name;
    const oldRoute = flowCurrent.oldRoute ? flowCurrent.oldRoute.name : null;
    const hasTransition = self.applyTransitions(newRoute, oldRoute);

    console.log("section", this._sections)

    _.each(this._sections, function(parentElement, section) {
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
  }
}

export default Flow