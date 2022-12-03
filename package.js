Package.describe({
  name: 'marcotribuz:flow-transition',
  version: '1.0.7',
  summary: 'A transition and layout renderer for Ostrio FlowRouter',
  git: 'https://github.com/MarcoTribuz/FlowTransition',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('2.5.8');

  api.use(['modules', 'ecmascript', 'promise', 'templating@1.4.2', 'blaze@2.6.1', 'velocityjs:velocityjs@1.2.1', 'ostrio:flow-router-extra@3.9.0'], 'client');

  api.mainModule('_init.js', 'client')
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.addFiles('flow-transition-tests.js');
});
