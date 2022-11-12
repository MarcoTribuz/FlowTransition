import {Meteor} from 'meteor/meteor'
import {Template} from 'meteor/templating'
import {Blaze} from "meteor/blaze";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './section.html'

class Flow {
  constructor() {
    this._transitionStore = {}
    this._sections = {}
    this._ready = false
    const localSection = this._sections
    console.log('Flow Constructor')

    Template.section = new Template('section', function () {});
    Template.section.onCreated(function () {
      console.log('OnCreated Template')
    });
    Template.section.onRendered(function () {
      const section = this.data.name;
      console.log('CAZZO CI SONO Template', section)
      localSection[section] = document.getElementById(section);
    });
  }

  _setUiHooks(parentElement, transitions) {
    console.log('Set UI Hooks')
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

  _attachDeepObject(section, to, from) {
    return !!section && !!to && !!from
  }

  _attachFullPageAnimations() {
    console.log('Attach Full page animation')
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
    let self = this
    const {section, to, from, txIn, txOut, txFull} = transition
    let attached = this._attachDeepObject(section, to, from);
    if (!attached) {
      console.log("A FlowTransition transition object must have the parameters:" +
        " section, from, to; and should have the parameters: txFull or txIn & txOut.");
    }

    if (txFull) this._attachFullPageAnimations.call(transition);

    if (!self._transitionStore.hasOwnProperty(transition.section)) self._transitionStore[transition.section] = {}
    if (!self._transitionStore[transition.section].hasOwnProperty(transition.to)) self._transitionStore[transition.section][transition.to] = {}
    if (!self._transitionStore[transition.section][transition.to].hasOwnProperty(transition.from)) self._transitionStore[transition.section][transition.to][transition.from] = {}

    if (txIn && !self._transitionStore[transition.section][transition.to][transition.from].hasOwnProperty(transition.txIn)) self._transitionStore[transition.section][transition.to][transition.from]['txIn'] = (typeof transition.txIn === 'string') ? {properties: transition.txIn} : transition.txIn;
    if (txOut && !self._transitionStore[transition.section][transition.to][transition.from].hasOwnProperty(transition.txIn)) self._transitionStore[transition.section][transition.to][transition.from]['txOut'] = (typeof transition.txOut === 'string') ? {properties: transition.txOut} : transition.txOut;
  }

  applyTransitions (newRoute, oldRoute) {
    console.log('apply transition', newRoute, oldRoute)
    let _fts = this._transitionStore;
    console.log('apply transition FTS', _fts)

    let hasTransition = {};
    const setUiHooks = (parentElement, transition) => this._setUiHooks(parentElement, transition)

    _.each(this._sections, function(parentElement, section) {
      console.log("section in each", section)
      // get the transition object or set it to null
      const transitions = oldRoute && _fts[section] && _fts[section][newRoute] && _fts[section][newRoute][oldRoute] &&
        _fts[section][newRoute][oldRoute];
      hasTransition[section] = !!transitions;

      // when transitions is null, stale _uihooks will be removed from the parentElement
      setUiHooks(parentElement, transitions);
    });
    console.log("apply transition has transition", hasTransition)
    // let the caller know which sections have transitions
    return hasTransition;
  }

  flow(routerTo) {

    console.log('FLOWROUTER FLOW', arguments, this._ready)
    const self = this

    let layoutAssignment = arguments;
    if (!this._ready) { // make sure the initial Template sections are loaded
      Meteor.defer(function() {
        self._ready = true;
        self.flow.apply(self, layoutAssignment);
      });
      return;
    }
    console.log("routerTo",  routerTo)
    console.log("layout", layoutAssignment)

    const _newLayout = Object.assign({}, layoutAssignment);

    console.log('NEW LAYOUT', _newLayout)

    const flowCurrent = FlowRouter.current();
    const newRoute = flowCurrent.route.name;
    const oldRoute = flowCurrent.oldRoute ? flowCurrent.oldRoute.name : null;

    console.log('OLD & NEW', oldRoute, newRoute)

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
