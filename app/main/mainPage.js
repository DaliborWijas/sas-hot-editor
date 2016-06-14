angular.module('myApp.main', ['ngRoute', 'dynamicHandsontable'])

.config([
  '$routeProvider',
  function ($routeProvider) {
    $routeProvider.when('/', {
      templateUrl: 'main/mainPage.html',
      controller: 'MainCtrl'
    });
  }
])

.controller('SideCtrl', [
  '$scope',
  'sasAdapter',
  '$mdDialog',
  'ngmTour',
  function($scope, sasAdapter, $mdDialog, ngmTour) {
    var tablesMap = {};
    $scope.libs = [];

    $scope.$watch('sideData.library', function(newValue) {
      if(!$scope.sideData.library) {
        return;
      }
      //moved to next event loop tick with timeout
      //setting timeout enables the selected item to finish animation first and then update the Tables select
      setTimeout(function() {
        $scope.$parent.tables = tablesMap[newValue];
      }, 0);
      //deselect table if it doesn't exist in sub array
      if(tablesMap[newValue] && tablesMap[newValue].indexOf($scope.sideData.table) === -1) {
        $scope.sideData.table = undefined;
      }
    });

    $scope.$watch('sideData.table', function() {
      if(!$scope.sideData.table) {
        $scope.tableInfo = {};
        return;
      }
      var table = sasAdapter.createTable([
        {libname: $scope.sideData.library, memname: $scope.sideData.table}
      ], 'memberDetails');

      sasAdapter.call('/Apps/tableEditor/getMemberDetails', table).then(function(res) {
        $scope.tableInfo = res.memInfo[0];
      }, function(err) {
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title('Error')
            .textContent(err.message || 'Unknown error occurred. Please check your internet connection and try again.')
            .ariaLabel('Unknown error')
            .ok('OK')
        );

        $scope.loading = false;
      });
    });

    sasAdapter.call('/Apps/tableEditor/startupService').then(function(res) {
      if(!ngmTour.isDone()) {
        ngmTour.start();
      }

      res.libsmems.forEach(function(lib) {
        if($scope.libs.indexOf(lib.LIBNAME) === -1) {
          $scope.libs.push(lib.LIBNAME);
        }
        //create sub array if it doesn't exist
        if(!tablesMap[lib.LIBNAME]) {
          tablesMap[lib.LIBNAME] = [];
        }
        if(tablesMap[lib.LIBNAME].indexOf(lib.MEMNAME) === -1) {
          tablesMap[lib.LIBNAME].push(lib.MEMNAME);
        }
      });
    }, function(err) {
      $mdDialog.show(
        $mdDialog.alert()
          .clickOutsideToClose(true)
          .title('Error')
          .textContent(err.message || 'Unknown error occurred. Please check your internet connection and try again.')
          .ariaLabel('Unknown error')
          .ok('OK')
      );
    });
  }
])

.controller('MainCtrl', [
  '$scope',
  'sasAdapter',
  '$rootScope',
  '$mdToast',
  '$mdDialog',
  function ($scope, sasAdapter, $rootScope, $mdToast, $mdDialog) {
    $scope.loading = false;
    $scope.tables = []; //used in child scope of SideCtrl
    $scope.sideData = {}; //used in child scope of SideCtrl
    var table;

    var toast = $mdToast.build({
      hideDelay: 1800,
      position: 'bottom right'
    });

    $scope.onHandsontableError = function(msg) {
      toast.template('<md-toast class="error"><div>' + msg +'</div></md-toast>');
      $mdToast.show(toast);
    };

    $scope.onHandsontableDataEdit = function(changes, instance) {
      $scope.tableDataChanged = true;

      $scope.tableIsValid = true;
      instance.getCellsMeta().forEach(function(cell) {
        if(cell && cell.valid === false) {
          $scope.tableIsValid = false;
        }
      });
    };

    $scope.open = function() {
      $scope.loading = true;
      table = sasAdapter.createTable([
        {libname: $scope.sideData.library, memname: $scope.sideData.table}
      ], 'data', 10 * 1000);

      sasAdapter.call('/Apps/tableEditor/getTable', table).then(function(res) {
        $scope.loading = false;
        $scope.htDynamicSpec = res.columnspec;
        $scope.htData = res.tabledata;

        $scope.tableDataChanged = false;
      }, function(err) {
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title('Error')
            .textContent(err.message || 'Unknown error occurred. Please check your internet connection and try again.')
            .ariaLabel('Unknown error')
            .ok('OK')
        );

        $scope.loading = false;
      });
    };

    $scope.save = function() {
      if($scope.tableIsValid === false) {
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title('Save Error')
            .textContent('Your data is invalid and cannot be saved. Please check the table for red cells.')
            .ariaLabel('Save Error - invalid table data')
            .ok('OK')
        );
      } else {
        $scope.loading = true;
        table.add($scope.htData, 'tabledata');
        sasAdapter.call('/Apps/tableEditor/writeTable', table).then(function(res) {
          $scope.loading = false;
          $scope.htDynamicSpec = res.columnspec;
          $scope.htData = res.tabledata;

          $scope.tableDataChanged = false;
        }, function(err) {
          $mdDialog.show(
            $mdDialog.alert()
              .clickOutsideToClose(true)
              .title('Error')
              .textContent(err.message || 'Unknown error occurred. Please check your internet connection and try again.')
              .ariaLabel('Unknown error')
              .ok('OK')
          );

          $scope.loading = false;
        });
      }
    };

    $scope.saveAs = function() {
      if(!$scope.sideData.library) {
        $mdDialog.show(
          $mdDialog.alert()
            .clickOutsideToClose(true)
            .title('Library not selected')
            .textContent('Please select a target library first')
            .ariaLabel('Library not selected')
            .ok('OK')
        );
      } else {
        //TODO: use template with required input field
        $mdDialog.show({
          scope: $scope,
          preserveScope: true,
          controller: [
            '$scope',
            function($scope) {
              $scope.local = {};

              $scope.local.cancel = function() {
                delete $scope.local;
                $mdDialog.hide();
              };

              $scope.local.save = function() {
                if(!$scope.local.table) {
                  return;
                }
                $scope.loading = true;

                table = sasAdapter.createTable([
                  {libname: $scope.sideData.library, memname: $scope.local.table}
                ], 'data', 10 * 1000);
                table.add($scope.htData, 'tabledata');

                sasAdapter.call('/Apps/tableEditor/writeTable', table).then(function(res) {
                  $scope.tables.push($scope.local.table);
                  $scope.sideData.table = $scope.local.table;
                  delete $scope.local.table;

                  $scope.loading = false;
                  $scope.htDynamicSpec = res.columnspec;
                  $scope.htData = res.tabledata;

                  $scope.tableDataChanged = false;

                  delete $scope.local;
                }, function(err) {
                  delete $scope.local;
                  $mdDialog.show(
                    $mdDialog.alert()
                    .clickOutsideToClose(true)
                    .title('Error')
                    .textContent(err.message || 'Unknown error occurred. Please check your internet connection and try again.')
                    .ariaLabel('Unknown error')
                    .ok('OK')
                  );

                  $scope.loading = false;
                });

                $mdDialog.hide();
              };
            }
          ],
          templateUrl: 'main/saveAsDialog.html'
        });
      }
    };

    $scope.delete = function() {
      var confirm = $mdDialog.confirm()
        .title('Delete')
        .textContent('Are you sure you want to delete table ' + $scope.sideData.table + '?')
        .ariaLabel('Delete table')
        .ok('Delete')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function() {
        table = sasAdapter.createTable([
          {libname: $scope.sideData.library, memname: $scope.sideData.table}
        ], 'data');

        sasAdapter.call('/Apps/tableEditor/deleteTable', table).then(function(res) {
          for(var i = 0; i < $scope.tables.length; i++) {
            if($scope.sideData.table.toLowerCase() === $scope.tables[i].toLowerCase()) {
              $scope.tables.splice(i, 1);
              $scope.sideData.table = null;
              $scope.htData = null;
              $scope.htDynamicSpec = null;
              return;
            }
          }
        });
      });
    };

    $scope.onUploadDone = function(res) {
      $scope.htDynamicSpec = res.columnspec;
      $scope.htData = [];
      var error = false;
      for(var i = 0; i < res.tabledata.length; i++) {
        if(error) break;
        for(var key in res.tabledata[i]) {
          try {
            res.tabledata[i][key] = decodeURIComponent(res.tabledata[i][key]);
          } catch(e) {
            $mdDialog.show(
              $mdDialog.alert()
              .clickOutsideToClose(true)
              .title('Error')
              .textContent('The editor doesn\'t support special characters.')
              .ariaLabel('Error')
              .ok('OK')
            );
            error = true;
            break;
          }
        }
        if(!error) {
          $scope.htData.push(res.tabledata[i]);
        }
      }
      $scope.loading = false;
      $scope.$apply();
    };
  }
]);
