Package.describe({
  name: 'marcotribuz:flow-transition',
  version: '1.0.6',
  summary: 'A transition and layout renderer for Ostrio FlowRouter',
  git: 'https://github.com/MarcoTribuz/FlowTransition',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2');

  api.use(['modules', 'ecmascript', 'promise', 'templating', 'blaze'], 'client');

  api.use('velocityjs:velocityjs@1.2.1');
  api.use('ostrio:flow-router-extra@3.9.0');

  api.mainModule('_init.js', 'client')
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.addFiles('flow-transition-tests.js');
});
