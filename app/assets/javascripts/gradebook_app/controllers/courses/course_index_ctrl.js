Gradebook.controller("ClassIndexCtrl", ["$scope", "ModalService", "courseList", function($scope, ModalService) {

  $scope.courses = courseList

  $scope.showNewClassModal = function() {
    ModalService.showModal({
      templateUrl: 'gradebook_templates/courses/new.html',
      controller: "NewCourseCtrl"
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(function(newCourse) {
        if (newCourse) {
          // add the new class to the scope, or get all classes
        }
        // remove leftover modal DOM elements if necessary
      })
    })  }
}])