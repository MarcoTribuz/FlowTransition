Package.describe({
  name: 'marcotribuz:flow-transition',
  version: '1.0.2',
  summary: 'A transition and layout renderer for Ostrio FlowRouter',
  git: 'https://github.com/MarcoTribuz/FlowTransition',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2');

  api.use('blaze');
  api.use('templating');
  api.use('underscore');
  api.use('velocityjs:velocityjs@1.2.1');
  api.use('ostrio:flow-router-extra@3.9.0');

  api.addFiles('section.html', 'client');
  api.addFiles('flow-transition.js', 'client');
  api.mainModule("FlowTransition", 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('marcotribuz:flow-transition');
  api.addFiles('flow-transition-tests.js');
});
