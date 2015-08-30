angular.module('it').controller('TemplateCtrl', function($scope, $location, $sce, util, LoadingService, TemplateService, GitHubService, template, mode, $timeout, toastr) {
  $scope.template = template;
  $scope.mode = mode;

  if ($scope.mode === 'copy') {
    $scope.template.name = '';
  }

  $scope.wrapInBraces = function(input) {
    return '{{' + input + '}}';
  };

  /*
   * Collaborator check logic
   */
  $scope.isCollaborator = $scope.mode === 'new';

  function checkIfUserIsCollaborator() {
    if ($scope.template.owner && $scope.template.repo && $scope.user && $scope.user.username) {
      GitHubService.checkUserIsCollaborator($scope.template.owner, $scope.template.repo, $scope.user.username, $scope.user.accessToken).then(function (isCollaborator) {
        $scope.isCollaborator = isCollaborator;
        if (!isCollaborator) {
          showCollabWarning();
        } else {
          if ($scope.isCollaborator && $scope.template.owner !== '' && $scope.template.repo !== '') {
            // if the user is a collaborator of a project, fetch the related milestones
            getMilestones();
          }
        }
      });
    } else {
      $scope.isCollaborator = false;
    }
  }
  var timeout;

  function checkTimeout() {
    $timeout.cancel(timeout);
    return $timeout(function() {
      checkIfUserIsCollaborator();
      if (mode !== 'edit') {
        checkIfOverwritingTemplate();
      }
    }, 500, true);
  }

  $scope.$watch('template.owner + template.repo + user + template.name', function() {
    timeout = checkTimeout();
  });

  function getMilestones () {
    var accessToken = $scope.user.accessToken;
    var template = $scope.template;
    var promise = GitHubService.getRepositoryMilestones(accessToken, template.owner, template.repo);
    promise.then(function (response) {
      $scope.milestones = response.data;
    });
  }

  function showCollabWarning() {
    toastr.warning('You are not a collaborator on ' + util.simpleCompile('{{owner}}/{{repo}}.' +
      ' You wont be able to save this template.', $scope.template), 'Warning...');
  }


  /*
   * Template overwrite logic
   */
  function checkIfOverwritingTemplate() {
    if ($scope.template.owner && $scope.template.repo && $scope.template.name) {
      TemplateService.getTemplate($scope.template).once('value', function(template) {
        if (template.val()) {
          showOverwriteWarning();
        }
      });
    }
  }

  function showOverwriteWarning() {
    toastr.warning('There is already a template at ' + util.simpleCompile('{{owner}}/{{repo}}/{{name}}.' +
      ' Saving this template will overwrite that template.', $scope.template), 'Warning...');
  }

  $scope.$watch('template.template', function(template) {
    $scope.templatePreview = $sce.trustAsHtml(util.hideCommentsAndHTMLize(template));
  });

  /*
   * Form controls
   */
  $scope.deleteTemplate = function() {
    if ($scope.isCollaborator) {
      TemplateService.deleteTemplate($scope.template);
      $location.path('/');
    } else {
      showCollabWarning();
    }
  };

  $scope.copyTemplate = function() {
    $location.path('/new-template').search({
      copy: true,
      owner: $scope.template.owner,
      repo: $scope.template.repo,
      name: $scope.template.name,
      labels: $scope.template.labels
    });
  };

  $scope.removeField = function(index) {
    $scope.template.fields.splice(index, 1);
  };

  $scope.submitTemplate = function() {
    if ($scope.isCollaborator) {
      $scope.template.createdBy = $scope.user.login;
      $scope.template.titleTemplate = $scope.template.titleTemplate || '{{title}}';
      TemplateService.saveTemplate(JSON.parse(angular.toJson($scope.template)));
      $scope.templateUrl = util.simpleCompile('#/{{owner}}/{{repo}}/{{name}}', $scope.template);
    } else {
      showCollabWarning();
    }
  };

  LoadingService.loadingState(false);

});
