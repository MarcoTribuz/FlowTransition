import {Meteor} from 'meteor/meteor'
import {Template} from 'meteor/templating'
import {Blaze} from "meteor/blaze";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './section.html'

class Flow {
  constructor() {
    const self = this
    this._transitionStore = {}
    this._ready = false
    this._sectionName = null
    this._parent = null
    this._sectionsHaveTransition = {}

    Template.section.onRendered(function () {
      self._sectionName = this.data.name;
      self._parent = document.getElementById(self._sectionName)
    });
  }

  // todo analyse
  _setUiHooks(parentElement, transitions) {
    console.debug('[Flow][_setUiHooks] Setting UI Hooks with params', parentElement, transitions)
    if (!parentElement || !transitions) return
    let uiHooks = {};
    let { txIn, txOut } = transitions
    if (txIn) {
      const insertElement = (node) => {
        // set up the hooks to apply properties before insertion
        for (const hookProperty in txIn.hook) {
          $.Velocity.hook(node, hookProperty, txIn.hook[hookProperty]);
        }

        // insert the new element
        $(node).prependTo(parentElement);

        // start the animation when the DOM is ready
        Meteor.defer(function() {
          $(node).velocity(txIn);
        });
      }
      uiHooks.insertElement = insertElement
    }else if(txOut){
      const removeElement = (node) => {

        // callback = node.remove + user defined callback
        txOut.options = txOut.options || {};
        txOut.options.complete = (function(complete) {

          return function() {
            if (complete) {
              complete.apply(complete, arguments);
            }
            $(node).remove();
          };

        })(txOut.options.complete);

        for (const hookProperty in txOut.hook) {
          $.Velocity.hook(node, hookProperty, txOut.hook[hookProperty]);
        }

        // start the animation when the DOM is ready
        Meteor.defer(function() {
          $(node).velocity(txOut);
        });
      }
      uiHooks.removeElement = removeElement
    }

    parentElement._uihooks = uiHooks;
  }

  _attachDeepObject(section, to, from) {
    return !!section && !!to && !!from
  }

  //todo analyse
  _attachFullPageAnimations() {
    console.debug('[Flow][_attachFullPageAnimations] Attaching full page animation')
    let _txName, _options, _property, _value, _valueOpposite;
    let transitionsList = ['down', 'up', 'left', 'right']

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
    if (transitionsList.some((el) => el === _txName)) {
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

  /**
   * Function that add the single transition in the class, to find in a second time
   * @param {object} transition - the transition object to add to the class
   *
   */
  addTransition (transition) {
    console.debug("[Flow][addTransition] Adding transition with params", transition)
    let self = this
    const {section, to, from, txIn, txOut, txFull} = transition
    let attached = this._attachDeepObject(section, to, from);
    if (!attached) {
      console.log("A FlowTransition transition object must have the parameters:" +
        " section, from, to; and should have the parameters: txFull or txIn & txOut.");
    }

    if (txFull) this._attachFullPageAnimations.call(transition);

    if (!self._transitionStore.hasOwnProperty(section)) self._transitionStore[section] = {}
    if (!self._transitionStore[section].hasOwnProperty(to)) self._transitionStore[section][to] = {}
    if (!self._transitionStore[section][to].hasOwnProperty(from)) self._transitionStore[section][to][from] = {}

    if (txIn && !self._transitionStore[section][to][from].hasOwnProperty(txIn)) self._transitionStore[section][to][from]['txIn'] = (typeof txIn === 'string') ? {properties: txIn} : txIn;
    if (txOut && !self._transitionStore[section][to][from].hasOwnProperty(txOut)) self._transitionStore[section][to][from]['txOut'] = (typeof txOut === 'string') ? {properties: txOut} : txOut;

    //self._sectionsHaveTransition[section] = !!(txFull || txIn || txOut);

  }

  findTransition(newRoute, oldRoute){
    console.debug("[Flow][findTransition] Finding transition with params", oldRoute, newRoute)
    const self = this
    const transitionStore = self._transitionStore
    return transitionStore[self._sectionName] && transitionStore[self._sectionName][newRoute] && transitionStore[self._sectionName][newRoute][oldRoute] || null
  }

  hasSectionTransition (section) {
    console.debug("[Flow][hasSectionTransition] Checking if the section has transition with params", section)
    const self = this
    return self._sectionsHaveTransition[section]
  }

  applyTransitions (newRoute, oldRoute) {
    console.debug("[Flow][applyTransitions] Applying transition with params", newRoute, oldRoute)
    const self = this
    let transitionFound = self.findTransition(newRoute, oldRoute)
    self._setUiHooks(self._parent, transitionFound);
  }

  flow(routerTo) {
    console.debug("[Flow][flow] Routing with transition with params", routerTo)
    const self = this
    let flowCurrent = null
    let newRoute = null
    let oldRoute = null
    let hasTransition = false

    if (!this._ready) { // make sure the initial Template sections are loaded
      Meteor.defer(function() {
        self._ready = true;
        self.flow(routerTo);
      });
      return;
    }

    flowCurrent = FlowRouter.current();
    newRoute = flowCurrent.route.name;
    oldRoute = flowCurrent.oldRoute ? flowCurrent.oldRoute.name : null;

    self.applyTransitions(newRoute, oldRoute);
    //hasTransition = self.hasSectionTransition(routerToValue) //todo analyse

    const oldNode = self._parent.firstElementChild;
    if (oldNode) Blaze.remove(Blaze.getView(oldNode));
    const newContent = Template[routerTo];
    Blaze.render(newContent, self._parent);
  }
}

export default Flow
