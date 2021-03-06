Gradebook.controller('CourseShowCtrl', ['$scope', 'course', "StudentService", "AssignmentService", "GPAService", "ModalService", "$state", "CourseService", "SubmissionService", "CurveService", "$rootScope", function($scope, course, StudentService, AssignmentService, GPAService, ModalService, $state, CourseService, SubmissionService, CurveService, $rootScope){
  
  var cols =[];
  var allRows= [];
  $scope.failingStudents = {};
  $scope.exceptionalStudents = {};

  $scope.getLengthFailing = function() {
    count = 0;
    for(key in $scope.failingStudents) {
      count ++
    }
    return count;
  }

  $scope.getLengthPassing = function() {
    count = 0;
    for(key in $scope.exceptionalStudents) {
      count ++
    }
    return count;
  }

  $scope.course = course;

  $scope.rawGPA = GPAService.rawGPA($scope.course);
  $scope.students = $scope.course.students;

  

  StudentService.sortSubmissions($scope.course.students);

  $scope.students = StudentService.sortStudents($scope.course.students);

  var assignments = $scope.course.assignments.sort(function(a,b) {
    var createdAtA = a.id;
    var createdAtB = b.id;
    if(createdAtA < createdAtB) {
      return -1;
    }
    if(createdAtB < createdAtA) {
      return 1;
    }
    else {
      return 0;
    }
  })

  $scope.assignments = assignments

  $scope.percentScore = function(item, index) {
    if(index > 3 && index < $scope.colCount - 1 && $scope.assignments[index - 4]) {
      var assignment = $scope.assignments[index - 4];
      var rawPercent = (item / assignment.possible_score * 100);
      if(rawPercent < 0) {
        return "No Score"
      }
      else if(assignment.flat_curve) {
        return ((rawPercent + assignment.flat_curve.flat_rate).toFixed(1) + "%");
      }
      else if(assignment.linear_curve) {
        return ((CurveService.linearFormula(assignment.linear_curve, rawPercent)).toFixed(1) + "%");
      }
      else {
        return (rawPercent.toFixed(1) + "%");
      }
    }
  }

  $scope.isItemScore = function(item, index) {
    if(index > 3 && index < $scope.colCount - 1) {
      return "(" + item + ")";
    }
    else {
      return item;
    }
  }

  $scope.showNotifications = function(failingStudents, exceptionalStudents) {
    ModalService.showModal({
      templateUrl: '/gradebook_templates/notifications/show.html',
      controller: 'NotificationsShowCtrl',
      inputs: {
        exceptionalStudents: exceptionalStudents,
        failingStudents: failingStudents,
        students: $scope.students,
        course: $scope.course
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close;
    })
  }

  $scope.studentDetailModal = function(email, overall) {
    ModalService.showModal({
      templateUrl: '/gradebook_templates/students/detail.html',
      controller: 'StudentModalCtrl',
      inputs: {
        students: $scope.students,
        email: email,
        assignments: $scope.assignments,
        overall: overall
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close;
    })
  }

  $scope.courseDetailModal = function(gpa) {
    ModalService.showModal({
      templateUrl: '/gradebook_templates/courses/detail.html',
      controller: 'CourseModalCtrl',
      inputs: {
        course: $scope.course,
        assignments: $scope.assignments,
        gpa: gpa,
        students: $scope.students
      }
    }).then(function(modal) {
      modal.element.one('hidden.bs.modal', function () {
        if (!modal.controller.closed) {
            modal.controller.closeModal();
        }
      })
      modal.element.modal();
      modal.close;
    })
  }

  $scope.update = function(title) {
    CourseService.updateCourse({course: {title: title}}, $scope.course);
  }


  for (var i = 0; i < $scope.assignments.length; i++){
      cols.push($scope.assignments[i].title);
  }

  var rowData = [];
  for(var j = 0; j < $scope.students.length; j++ ) {
    var rawTotal = 0;
    var possibleTotal = 0;
    rowData.push($scope.students[j].id);
    rowData.push($scope.students[j].first_name);
    rowData.push($scope.students[j].last_name);
    rowData.push($scope.students[j].email);
    for(var i = 0; i < $scope.students[j].submissions.length; i++) {
      var rawScore = $scope.students[j].submissions[i].raw_score;
      var possibleScore = $scope.assignments[i].possible_score;
      //Put default value here;
      if(rawScore === -1) {
        //Assignment does not count in overall score
      }
      else {
        rawTotal += rawScore;
        possibleTotal += possibleScore;
      }
      rowData.push(rawScore);
    }
    allRows.push(rowData);
    rowData = [];
  }

  //Go through the failing students and remove now passing students
  $scope.removePassingStudents = function(passingStudent) {
    for(key in $scope.failingStudents) {
      if (key === passingStudent) {
        delete $scope.failingStudents[key];
      }
    }
  }
  //Go through exceptional students and remove any that are not doing exceptional anymore
  $scope.removeExceptionalStudents = function(notExceptionalStudent) {
    for(key in $scope.exceptionalStudents) {
      if (key === notExceptionalStudent) {
        delete $scope.exceptionalStudents[key];
      }
    }
  }

  $scope.showScore = function(j) {
    //Get the overall score of all the students
    $scope.students = StudentService.sortStudents($scope.course.students);
    if (j >= 0) {
      var rawTotal = 0;
      var possibleTotal = 0;
      for (var i = 0; i < $scope.assignments.length; i++) {
        var assignment = $scope.assignments[i];
        var rawPercent = $scope.students[j].submissions[i].raw_score / assignment.possible_score * 100
        var curvedPercent;
        if(rawPercent >= 0) {
          if(assignment.flat_curve) {
             curvedPercent = rawPercent + assignment.flat_curve.flat_rate;
          }
          else if(assignment.linear_curve) {
            curvedPercent = CurveService.linearFormula(assignment.linear_curve, rawPercent)
          }
          else {
            curvedPercent = rawPercent
          }
          var possibleScore = assignment.possible_score;
          var curvedPoints = curvedPercent / 100 * possibleScore;
          rawTotal += curvedPoints;
          possibleTotal += possibleScore;
        }
      } 
      var score = (Number(rawTotal / possibleTotal * 100).toFixed(1))
      //Get all of the failing students and put it in an object for display to the teacher
      if(score >= 0 && score < 60) {
        var failingStudent = $scope.students[j].first_name + " " + $scope.students[j].last_name;
        $scope.failingStudents[failingStudent] = score;
        $scope.removeExceptionalStudents(failingStudent);
      }
      //Remove students who were failing and are no longer failing
      else if(score > 60 && score < 90) {
        var passingStudent = $scope.students[j].first_name + " " + $scope.students[j].last_name;
        $scope.removePassingStudents(passingStudent);
      }
      //Get all exceptional students and put them in an object to display to the teacher
      else if(score > 90) {
        var exceptionalStudent = $scope.students[j].first_name + " " + $scope.students[j].last_name;
        $scope.exceptionalStudents[exceptionalStudent] = score;
        $scope.removePassingStudents(exceptionalStudent);
      }
      else {
        score = 0;
      }
    $scope.anyFailingStudents = $scope.getLengthFailing();
    $scope.anyExceptionalStudents = $scope.getLengthPassing();
    return score;
    }
  }
      


  $scope.colCount = $scope.assignments.length + 5;
  $scope.rowCount = $scope.students.length;



  $scope.submitEdit = function(row, item, index) {
    var student;
    var submission;
    $rootScope.$broadcast("submission.edit");
    var rowIndex = $scope.allRows.indexOf(row);
    if(index > 0 && index < 4) {
      student = $scope.students[rowIndex];
      StudentService.editStudent(student, index, item);
    }
    else if (index > 3 && index < row.length) {
      var student;
      var assignmentId = $scope.assignments[index - 4].id
      for(var i = 0; i < $scope.students.length; i++) {
        if($scope.students[i].id === row[0]) {
          $scope.allRows[i][index] = parseInt(item);
          student = $scope.students[i];
        }
      }
      submission = student.submissions[index - 4];
      submission.raw_score = parseInt(item);
      SubmissionService.editSubmission(submission);
    }
    
    //}
    $scope.rawGPA = GPAService.rawGPA(course);
  }



    //   else if (index > 3 && index < row.length) {
    //   var submission;
    //   for(var i = 0; i < $scope.students.length; i ++) {
    //     if($scope.students[i].id == row[0]) {
    //       for(var j = 0; j < $scope.students[i].submissions.length; j++) {
    //         if($scope.students[i].submissions[j].assignment_id == assignmentId) {
    //           //console.log(submission)
    //           submission = $scope.students[i].submissions[j]
    //           console.log(submission)
    //           submission.raw_score = parseInt(item);
    //           $scope.students[i].submissions[j].raw_score = parseInt(item);
    //           $scope.course.students[i].submissions[j].raw_score = parseInt(item);
    //           for(var k = 0; k < $scope.assignments[index - 4].submissions.length; k++) {
    //             if($scope.assignments[index - 4].submissions[k].student_id === $scope.students[i].id) {
    //               console.log($scope.assignments[index - 4].submissions[k])
    //               $scope.assignments[index - 4].submissions[k].raw_score = parseInt(item);
    //             }
    //           }
    //           //$scope.assignments[index - 4].raw_score = parseInt(item);
    //           // console.log(submission.assignment_id)
    //           // console.log(assignmentId)
    //           // console.log(j + 4)
    //           // console.log($scope.allRows[i])
    //           $scope.allRows[i][j + 4] = parseInt(item);
    //         }
    //       }
    //     }
    //   }
    //   SubmissionService.editSubmission(submission);
    // }

  $scope.checkItem = function(index, item) {
    if (index === 0) {
      return "You cannot update the student's id";
    }
    if(index === 3 && !item.includes("@")) {
      return "Please enter a valid student email";
    }
    else if(index === $scope.colCount - 1) {
      return "You cannot update the overall score. Update specific scores.";
    }
    else if(index > 3 && !(parseInt(item) > -2)) {
      return "The score needs to be a positive number greater than 0";
    }
    else if(index < $scope.colCount - 1) {
      return true;
    }
  }

  $scope.showAssignmentModal = function(assignment) {
    ModalService.showModal({
      templateUrl: "gradebook_templates/assignments/show.html",
      controller: "AssignmentShowCtrl",
      inputs: {
        assignment: assignment,
        course: course,
        students: $scope.students
      }
    }).then(function(modal) {

      modal.element.one('hidden.bs.modal', function () {
        if (!modal.controller.closed) {
          modal.controller.closeModal();
        }
      });
      modal.element.modal();
      modal.close.then(function(response) {

      })
    })
  }

  $scope.addStudentModal = function(course) {
    ModalService.showModal({
      templateUrl: "gradebook_templates/students/new.html",
      controller: "StudentNewCtrl",
      inputs: {
        course: course
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(function(response) {

      })
    })
  }

  $scope.addAssignmentModal = function(course) {
    ModalService.showModal({
      templateUrl: "gradebook_templates/assignments/new.html",
      controller: "AssignmentNewCtrl",
      inputs: {
        course: course
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(function(response) {

      })
    })
  }


  $scope.removeStudentModal = function(course) {
    ModalService.showModal({
      templateUrl: "gradebook_templates/students/destroy.html",
      controller: "StudentDestroyCtrl",
      inputs: {
        course: course
      }
    }).then(function(modal) {
      modal.element.modal();
      modal.close.then(function(response) {
        // console.log(response)
      })
    })
  }


  $scope.$on("student.added", function(event, response) {
    var data = StudentService.studentData(response)
    console.log(response)
    $scope.rowCount ++;
    allRows.push(data);
    $scope.students.push(response);
    CourseService.sortRows($scope.allRows);
    StudentService.sortStudents($scope.course.students);
  })

  $scope.$on("assignment.edit", function(event, data) {
    var newAssignment = data.assignment_type + ": " + data.title +
                        "(" + data.possible_score + ")";
    for(var i = 0; i < $scope.assignments.length; i++) {
      if($scope.assignments[i].id === data.id) {
        $scope.cols[i] = newAssignment;
      }
    }
  })

  $scope.$on("assignment.added", function(event, data) {
    //Add student to the scope
    $scope.course.assignments.push(data);
    //Goes through all the students and pushes the newly
    //created blank submissions to the correct student's submissions array 
    for(var i = 0; i < data.submissions.length; i++) {
      for(var j = 0; j < $scope.students.length; j++) {
        if(data.submissions[i].student_id == $scope.students[j].id) {
          $scope.students[j].submissions.push(data.submissions[i]);
        }
      }
    };
    //Add student to the table and move over overall score
    $scope.colCount ++;
    $scope.cols[$scope.cols.length] =  data.title + ": " + data.assignment_type
                                        + "(" + data.possible_score
                                        + ")";
    for(var i = 0; i < $scope.allRows.length; i++) {
      //var temp = $scope.allRows[i].slice(-2)[0]
      //$scope.allRows[i][$scope.allRows[i].length - 1] = 0;
      $scope.allRows[i].push(-1);
    };
  })

  $scope.$on("student.deleted", function(event, data) {
    for(var i = 0; i < $scope.allRows.length; i ++) {
      if($scope.allRows[i][0] == data.id) {
        $scope.allRows.splice(i,1);
      }
    }
  })

  $scope.$on("assignment.deleted", function(event, data) {
    console.log("DELETED")
    for(var i = 0; i < $scope.assignments.length; i++) {
      if($scope.assignments[i].id === data.id) {
        $scope.cols.splice(i,1)
        $scope.assignments.splice($scope.course.assignments.indexOf($scope.assignments[i]), 1);
        for(var j = 0; j < $scope.allRows.length; j++) {
          $scope.allRows[j].splice(i + 4, 1);
        }
      }
    }
  })

  $scope.deleteCourse = function() {
    if (confirm('Are you sure?')) {
      CourseService.deleteCourse($scope.course).then(function(response) {
        $state.go("gradebook.courseIndex");
      })
    }
  };


  $scope.cols = cols;
  $scope.allRows = allRows;
  allRows = CourseService.sortRows($scope.allRows);

}])
