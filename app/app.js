(function() {
  var app = angular.module('it', ['ngRoute', 'firebase', 'ga']);

  app.constant('Firebase', Firebase);
  app.constant('_', _);
  app.constant('toastr', toastr);
  app.constant('markdown', markdown);

  function getTeplateInfo($q, util, service, fn, $route) {
    var routeParams = $route.current.params;
    return util.getDataSnapshot($q, service, fn, {
      name: routeParams.name,
      owner: routeParams.owner,
      repo: routeParams.repo
    });
  }

  var resolve = {
    template: function($q, util, TemplateService, $route) {
      return getTeplateInfo($q, util, TemplateService, TemplateService.getTemplate, $route);
    },
    fields: function($q, util, TemplateService, $route) {
      return getTeplateInfo($q, util, TemplateService, TemplateService.getTemplateFields, $route);
    },
    allTemplates: function($q, util, TemplateService) {
      return util.getDataSnapshot($q, TemplateService, TemplateService.getAllTemplates);
    },
    ownerTemplates: function($q, util, TemplateService, $route) {
      var deferred = $q.defer();
      var params = $route.current.params;
      util.getDataSnapshot($q, TemplateService, TemplateService.getOwnerTemplates, $route.current.params).then(function(data) {
        var owner = {};
        owner[params.owner] = {};
        _.each(data, function(repo, name) {
          owner[params.owner][name] = repo;
        });
        deferred.resolve(owner);
      }, function(err) {
        toastr.error('There was a problem loading the templates for this repo... Sorry!');
        deferred.reject(err);
      });
      return deferred.promise;
    },
    repoTemplates: function($q, util, TemplateService, $route, _, toastr) {
      var deferred = $q.defer();
      var params = $route.current.params;
      util.getDataSnapshot($q, TemplateService, TemplateService.getRepoTemplates, $route.current.params).then(function(data) {
        var ownerRepo = {};
        ownerRepo[params.owner] = {};
        ownerRepo[params.owner][params.repo] = {};
        _.each(data, function(template, name) {
          ownerRepo[params.owner][params.repo][name] = template;
        });
        deferred.resolve(ownerRepo);
      }, function(err) {
        toastr.error('There was a problem loading the templates for this repo... Sorry!');
        deferred.reject(err);
      });
      return deferred.promise;
    }
  };

  app.config(function($routeProvider, toastr) {
    toastr.options.closeButton = true;

    $routeProvider
      .when('/', {
        templateUrl: './app/search/search-templates.html',
        controller: 'SearchTemplatesCtrl',
        resolve: {
          owners: resolve.allTemplates
        }
      })
      .when('/new-template', {
        templateUrl: './app/templates/template.html',
        controller: 'TemplateCtrl',
        resolve: {
          template: function($q, util, TemplateService, $location) {
            var copy = $location.search().copy;
            if (copy) {
              return util.getDataSnapshot($q, TemplateService, TemplateService.getTemplate, {
                owner: $location.search().owner,
                repo: $location.search().repo,
                name: $location.search().name
              });
            } else {
              return {
                name: '',
                owner: '',
                repo: '',
                template: '',
                fields: [
                  {
                    name: '',
                    element: '',
                    type: '',
                    value: ''
                  }
                ]
              }
            }
          },
          mode: function($location) {
            if ($location.search().copy) {
              return 'copy';
            } else {
              return 'new';
            }
          }
        }
      })
      .when('/:owner', {
        templateUrl: './app/search/search-templates.html',
        controller: 'SearchTemplatesCtrl',
        resolve: {
          owners: resolve.ownerTemplates
        }
      })
      .when('/:owner/:repo', {
        templateUrl: './app/search/search-templates.html',
        controller: 'SearchTemplatesCtrl',
        resolve: {
          owners: resolve.repoTemplates
        }
      })
      .when('/:owner/:repo/:name/edit', {
        templateUrl: './app/templates/template.html',
        controller: 'TemplateCtrl',
        resolve: {
          template: resolve.template,
          mode: function() {
            return 'edit';
          }
        }
      })
      .when('/:owner/:repo/:name', {
        templateUrl: './app/new-issue/new-issue.html',
        controller: 'NewIssueCtrl',
        resolve: {
          template: resolve.template,
          fields: resolve.fields,
          issue: function() {
            return null;
          },
          issueNumber: function() {
            return null;
          }
        }
      })
      .when('/:owner/:repo/:name/:number', {
        templateUrl: './app/new-issue/new-issue.html',
        controller: 'NewIssueCtrl',
        resolve: {
          template: resolve.template,
          fields: resolve.fields,
          issue: function($q, GitHubService, $route) {
            var routeParams = $route.current.params;
            var deferred = $q.defer();
            GitHubService.getIssue({
              owner: routeParams.owner,
              repo: routeParams.repo,
              number: routeParams.number
            }).success(deferred.resolve).error(function(err) {
                deferred.resolve({error: err});
              });
            return deferred.promise;
          },
          issueNumber: function($route) {
            return $route.current.params.number;
          }
        }
      })
      .otherwise('/');
  });
  
  app.run(function($rootScope, LoadingService) {
    $rootScope.$on('$locationChangeStart', function (event, next, current) {
      LoadingService.loadingState(true);
    });
  });
})();