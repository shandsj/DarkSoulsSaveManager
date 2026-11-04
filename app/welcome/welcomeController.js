(function () {
    var welcomeController = function ($scope, $location, core) {
        var vm = this;
        var electronAPI = window.electronAPI;
        var path = electronAPI.path;
        var fs = electronAPI.fs;
        var storage = electronAPI.initializeStorage(electronAPI.getPath('userData'));

        vm.detectedSaves = [];
        if (electronAPI.platform === 'linux') {
            try {
                vm.detectedSaves = core.findProtonSaves();
            } catch (error) {
                // Save discovery is best-effort; manual file selection remains available.
            }
        }

        vm.useDetectedSave = function (save) {
            core.data.settings.saveFileLocation = save.path;
            vm.saveFileLocation = save.path;
        };

        vm.continue = function () {
            core.saveSettings();
            $location.path("/main")
        };

        //TODO load file data and redirect to main if exists
        if (fs.existsSync(storage.settingsPath)) {
            core.loadSettings();
            if (core.data && core.data.settings && core.data.settings.saveFileLocation)
            vm.continue();
        }

        vm.findSave = function () {
            var defaultPath = null;
            if (electronAPI.appData) {
                defaultPath = path.join(process.env.APPDATA, "DarkSoulsIII");
                if (!fs.existsSync(defaultPath)) defaultPath = '.';
                var directories = fs.readdirSync(defaultPath);
                var saveDir = _.find(directories, function(o) {
                    return fs.statSync(path.join(defaultPath, o)).isDirectory;
                });
                if (saveDir){
                    defaultPath = path.join(defaultPath, saveDir);
                }
            }
            electronAPI.showOpenDialog({
                properties: ['openFile'],
                defaultPath: defaultPath,
                filters: [
                    { name: 'Dark Souls Save', extensions: ['sl2'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            }).then(function (filePaths) {
                if (filePaths && filePaths.length > 0) {
                    core.data.settings.saveFileLocation = filePaths[0];
                    vm.saveFileLocation = filePaths[0];
                    $scope.$apply();
                }
            });
        };
    };

    angular.module("app").controller("welcomeController", ["$scope", "$location", "core", welcomeController]);
})();