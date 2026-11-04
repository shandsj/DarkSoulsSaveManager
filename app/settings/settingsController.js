(function () {
    var settingsController = function ($scope, $location, core) {
        var vm = this;
        var electronAPI = window.electronAPI;
        var fs = require("fs");

        vm.characters = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

        vm.data = _.cloneDeep(core.data);
        vm.core = core;

        vm.findSave = function () {
            electronAPI.showOpenDialog({ properties: ['openFile'] }).then(function (filePaths) {
                if (filePaths && filePaths.length > 0) {
                    vm.data.settings.saveFileLocation = filePaths[0];
                    $scope.$apply();
                }
            });
        };

        vm.save = function () {
            if (!vm.data.settings.saveDirectory.endsWith("/")) {
                vm.data.settings.saveDirectory += "/";
            }
            core.loadFromJson(JSON.stringify(vm.data));
            core.saveSettings();
            core.showSuccessToast("Settings Saved Successfully")
            core.updateNotificationVolume();
            $location.path("/main")
        };

        vm.cancel = function () {
            $location.path("/main")
        };



    };

    angular.module("app").controller("settingsController", ["$scope", "$location", "core", settingsController]);
})();