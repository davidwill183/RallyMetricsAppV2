var Ext = window.Ext4 || window.Ext;

var COMPUTE_METRICS_BUTTON_ID = 'compute-metrics-button';
var NUMBERS_COMBO_BOX_ID = 'numbers-combo-box';
var NUMBERS_STORE_ID = 'number-store';
var PROJECT_PICKER_ID = 'project-picker';
var RELEASE_COMBO_BOX_ID = 'release-combo-box';
var RELEASE_COMBO_BOX_ID_AS_QUERY = '#' + RELEASE_COMBO_BOX_ID;
var RESULTS_TABLE_ID = 'results-table';
var RETRIEVE_RESULTS_BUTTON_ID = 'retrieve-results-button';
var SPRINT_COMBO_BOX_ID = 'sprint-combo-box';
var UI_CONTAINER_ID = 'ui-container';
var UI_CONTAINER_ID_AS_QUERY = '#' + UI_CONTAINER_ID;

var MODELS = {
    FEATURE : 'PortfolioItem/Feature',
    USER_STORY : 'UserStory',
    DEFECT : 'Defect'
};

var FEATURE_STATES = {
    DONE : 'Done',
    EMPTY : ''
};

var COLUMN_TITLES = [
    "<b>PI Metrics</b>",
    "Features Planned",
    "Features Completed",
    "Feature Pts Planned",
    "Feature Pts Completed",
    "% Feature Pts Completed",
    "Business Value Planned",
    "Business Value Completed",
    "% BV Completed"
];

var ROW_TITLES = [
    " ",
    "WC Train",
    "PAS Train",
    "Pkg Train",
    "Tech Enb Train"
];

var plannedFeatures = [0,0,0,0];

var GRANDPARENT_TRAIN = "CUBE - Policy Administration";
var PARENT_TRAINS = [];
var CUBE_TEAMS = {};

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        var me = this;

        me.buildUIContainer(UI_CONTAINER_ID);
    },

    doComputeMetrics: function () {
        var me = this;

        for (var i = 0; i < CUBE_TEAMS.length; i++) {
            var featureStore = me.createTeamFeatureStore(CUBE_TEAMS[i]);
            window.console.log("What is the featureStore?", featureStore);
        }
    },

    doRetrieveResults: function () {
        var me = this;

        me.prepareResultsTable(RESULTS_TABLE_ID);
    },

    onProjectSelect: function (projectPicker) {
        var me = this;

        CUBE_TEAMS = projectPicker.selectedValues.items;
        var mostRecentSelection = CUBE_TEAMS.slice(-1)[0];
        window.console.log("What is the mostRecentSelection?", mostRecentSelection);
        me.addParentIfNecessary(mostRecentSelection);
    },

    onProjectDeselect: function (projectPicker) {
        CUBE_TEAMS = projectPicker.selectedValues.items;
    },

    onReleaseSelect: function () {

    },

    addParentIfNecessary: function (teamObject) {
        window.console.log("What is the teamObject?", teamObject);

        if (teamObject.data.Name === GRANDPARENT_TRAIN || teamObject.data.Parent.Name === GRANDPARENT_TRAIN) {
            return;
        }

        var parentName = teamObject.data.Parent.Name;

        for (var i = 0; i < PARENT_TRAINS.length; i++) {
            if (parentName === PARENT_TRAINS[i]) {
                return;
            }
        }

        PARENT_TRAINS.push(parentName);
        window.console.log("What is PARENT_TRAINS?", PARENT_TRAINS);

    },

    launchTeamFeatureSnapshotStores: function (teamFeatureStore) {
        var me = this;
        var refTeamFeatureRecords = teamFeatureStore.getItems();

        window.console.log("What are the teamFeatureRecords?", refTeamFeatureRecords);

        for (var i = 0; i < refTeamFeatureRecords.length; i++) {
            me.createTeamFeatureSnapshotStore(refTeamFeatureRecords[i], teamFeatureStore.storeId);
        }
    },

    analyzeFeature: function (featureSnapshotStore) {
        window.console.log("What is the feature snapshot store for " + featureSnapshotStore.data.items[0].data.FormattedID, featureSnapshotStore);

        var me = this;

        var refFeatureSnapshots = featureSnapshotStore.data.items;

        var featureProperties = {
            isPlanned: false,
            isCompleted: false,
            isAdded: false,
            isRemoved: false,
            isPartOfRelease: false
        };

        for (var i = 0; i < refFeatureSnapshots.length; i++) {
            featureProperties.isPartOfRelease = me.determineReleaseStatus(refFeatureSnapshots[i]);
            featureProperties.isPlanned = me.determinePlannedStatus(refFeatureSnapshots[i], featureProperties.isPlanned);
            featureProperties.isCompleted = me.determineCompletedStatus(refFeatureSnapshots[i], featureProperties.isCompleted);
            featureProperties.isAdded = me.determineAddedStatus(refFeatureSnapshots[i], featureProperties.isAdded, featureProperties.isPlanned);
            featureProperties.isRemoved = me.determineRemovedStatus(refFeatureSnapshots[i], featureProperties.isPartOfRelease, featureProperties.isRemoved);
        }

        if (featureProperties.isPlanned) {
            me.manage(plannedFeatures, 1, featureSnapshotStore.findConfig.Project);
            window.console.log("What is the planned status for: " + featureSnapshotStore.data.items[0].data.FormattedID + "?", featureProperties.isPlanned);
        }
    },

    manage: function (dataArray, amountToAdd, projectObjectId) {
        var me = this;

        var parentName = me.determineParent(projectObjectId);

        for (var i = 0; i < PARENT_TRAINS.length; i++) {
            if (parentName === PARENT_TRAINS[i]) {
                dataArray[i] += amountToAdd;
            }
        }
    },

    determineParent: function (projectObjectId) {
        for (var i = 0; i < CUBE_TEAMS.length; i++) {
            if (CUBE_TEAMS[i].data.ObjectID === projectObjectId) {
                return CUBE_TEAMS[i].data.Parent.Name;
            }
        }
    },

    determineReleaseStatus: function (featureSnapshot) {
        var me = this;

        var currentReleaseName = me._getReferenceToCurrentlySelectedRelease();
        return (featureSnapshot.data.Release.Name === currentReleaseName);
    },

    determinePlannedStatus: function (featureSnapshot, isPlanned) {
        if (isPlanned) {
            return true;
        }

        var me = this;

        var currentReleaseName = me._getReferenceToCurrentlySelectedRelease();
        var releaseStartDate = me._getCurrentlySelectedReleaseStartDate();
        var releaseEndDate = me._getCurrentlySelectedReleaseEndDate();
        var validFromDate = featureSnapshot.data._ValidFrom;
        var validToDate = featureSnapshot.data._ValidTo;

        if (validFromDate <= releaseStartDate && validToDate >= releaseStartDate && featureSnapshot.data.Release.Name === currentReleaseName) {
            return true;
        }

        return false;
    },

    determineCompletedStatus: function (featureSnapshot, isCompleted) {
        if (isCompleted) {
            return (featureSnapshot.data.State === FEATURE_STATES.DONE);
        }

        var me = this;

        var currentReleaseName = me._getReferenceToCurrentlySelectedRelease();
        var releaseStartDate = me._getCurrentlySelectedReleaseStartDate();
        var releaseEndDate = me._getCurrentlySelectedReleaseEndDate();
        var validFromDate = featureSnapshot.data._ValidFrom;
        var validToDate = featureSnapshot.data._ValidTo;

        if (releaseStartDate <= validFromDate && validFromDate <= releaseEndDate && featureSnapshot.data.Release.Name === currentReleaseName && featureSnapshot.data.State === FEATURE_STATES.DONE) {
            return true;
        }

        return false;
    },

    determineAddedStatus: function (featureSnapshot, isAdded, isPlanned) {
        if (isAdded) {
            return !isPlanned;
        }

        var me = this;

        var currentReleaseName = me._getReferenceToCurrentlySelectedRelease();
        var releaseStartDate = me._getCurrentlySelectedReleaseStartDate();
        var releaseEndDate = me._getCurrentlySelectedReleaseEndDate();
        var validFromDate = featureSnapshot.data._ValidFrom;
        var validToDate = featureSnapshot.data._ValidTo;

        if (validFromDate > releaseStartDate && validFromDate <= releaseEndDate && featureSnapshot.data.Release.Name === currentReleaseName && !isPlanned) {
            return true;
        }

        return false;
    },

    determineRemovedStatus: function (featureSnapshot, isPartOfRelease, isRemoved) {
        var me = this;

        if (isPartOfRelease) {
            var currentReleaseName = me._getReferenceToCurrentlySelectedRelease();
            return featureSnapshot.data.Release.Name !== currentReleaseName;
        }

        return isRemoved;
    },

    buildUIContainer: function (desiredContainerId) {
        var me = this;

        me.prepareUIContainer(desiredContainerId);
        me.prepareReleaseComboBox(RELEASE_COMBO_BOX_ID);
        me.prepareSprintComboBox(SPRINT_COMBO_BOX_ID);
        me.prepareNumbersComboBox(NUMBERS_COMBO_BOX_ID, NUMBERS_STORE_ID);
        me.prepareProjectPicker(PROJECT_PICKER_ID);
        me.prepareComputeMetricsButton(COMPUTE_METRICS_BUTTON_ID);
        me.prepareRetrieveResultsButton(RETRIEVE_RESULTS_BUTTON_ID);
    },

    prepareUIContainer: function (desiredContainerId) {
        var me = this;

        var uiContainer = me.createHBoxContainer(desiredContainerId);
        me.add(uiContainer);
    },

    prepareReleaseComboBox: function (desiredComboBoxId) {
        var me = this;

        var releaseComboBox = me.createReleaseComboBox(desiredComboBoxId);
        me.down(UI_CONTAINER_ID_AS_QUERY).add(releaseComboBox);

        window.console.log("What is the release combo box?", releaseComboBox);
    },

    prepareSprintComboBox: function (desiredComboBoxId) {
        var me = this;

        var sprintComboBox = me.createSprintComboBox(desiredComboBoxId);
        me.down(UI_CONTAINER_ID_AS_QUERY).add(sprintComboBox);
    },

    prepareNumbersComboBox: function (desiredComboBoxId, desiredNumberStoreId) {
        var me = this;

        var numberStore = me.createNumberStore(desiredNumberStoreId);
        var numbersComboBox = me.createNumbersComboBox(desiredComboBoxId, numberStore);
        me.down(UI_CONTAINER_ID_AS_QUERY).add(numbersComboBox);
    },

    prepareProjectPicker: function (desiredPickerId) {
        var me = this;

        var projectPicker = me.createProjectPicker(desiredPickerId);
        me.down(UI_CONTAINER_ID_AS_QUERY).add(projectPicker);

        window.console.log("What is the projectPicker?", projectPicker);
    },

    prepareComputeMetricsButton: function (desiredButtonId) {
        var me = this;

        var computeMetricsButton = me.createComputeMetricsButton(desiredButtonId);
        me.down(UI_CONTAINER_ID_AS_QUERY).add(computeMetricsButton);
    },

    prepareRetrieveResultsButton: function (desiredButtonId) {
        var me = this;

        var retrieveResultsButton = me.createRetrieveResultsButton(desiredButtonId);
        me.down(UI_CONTAINER_ID_AS_QUERY).add(retrieveResultsButton);
    },

    prepareResultsTable: function (desiredTableId) {
        var me = this;

        var resultsTable = me.createResultsTable(desiredTableId);
        me.add(resultsTable);
    },

    createHBoxContainer: function (desiredContainerId) {
        return Ext.create('Ext.container.Container', {
            itemId: desiredContainerId,
            layout: {
                type: 'hbox'
            }
        });
    },

    createReleaseComboBox: function (desiredComboBoxId) {
        var me = this;

        return Ext.create('Rally.ui.combobox.ReleaseComboBox', {
            fieldLabel: 'Release',
            labelAlign: 'right',
            itemId: desiredComboBoxId,
            listeners: {
                select: me.onReleaseSelect,
                scope: me
            }
        });
    },

    createSprintComboBox: function (desiredComboBoxId) {
        var me = this;

        return Ext.create('Rally.ui.combobox.IterationComboBox', {
            fieldLabel: 'Sprint',
            labelAlign: 'right',
            itemId: desiredComboBoxId,
            width: 425
        });
    },

    createNumbersComboBox: function (desiredComboBoxId, associatedStore) {
        return Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: 'Number of Sprints:',
            store: associatedStore,
            displayField: 'number',
            itemId: desiredComboBoxId,
            valueField: 'number',
            value: 1,
            width: 175
        });
    },

    createNumberStore: function (desiredNumberStoreId) {
        return Ext.create('Ext.data.Store', {
            fields: ['number'],
            storeId: desiredNumberStoreId,
            data: [
                {"number":"1"},
                {"number":"2"},
                {"number":"3"},
                {"number":"4"},
                {"number":"5"},
                {"number":"6"},
                {"number":"7"}
            ]
        });
    },

    createProjectPicker: function(desiredPickerId) {
        var me = this;

        return Ext.create('Rally.ui.picker.project.MultiProjectPicker', {
            listeners: {
                select: me.onProjectSelect,
                deselect: me.onProjectDeselect,
                scope: me
            },
            storeConfig: {
                fetch: ['Name', 'Parent']
            }
        });
    },

    createComputeMetricsButton: function (desiredButtonId) {
        var me = this;

        return Ext.create('Rally.ui.Button', {
            itemId: desiredButtonId,
            text: 'Compute Metrics',
            handler: me.doComputeMetrics,
            scope: me
        });
    },

    createRetrieveResultsButton: function (desiredButtonId) {
        var me = this;

        return Ext.create('Rally.ui.Button', {
            itemId: desiredButtonId,
            text: 'Retrieve Results',
            handler: me.doRetrieveResults,
            scope: me
        });
    },

    createResultsTable: function (desiredTableId) {
        var me = this;
        var tableItems = me.createTableItems();
        var currentlySelectedRelease = me._getReferenceToCurrentlySelectedRelease();

        return Ext.create('Ext.panel.Panel', {
            title: currentlySelectedRelease,
            titleAlign: 'center',
          width: '100%',
            itemId: desiredTableId,
            layout: {
                type: 'table',
                columns: 9,
                tableAttrs: {
                    style: {
                        width: '100%',
                        border: '5px solid black'
                    }
                }
            },
            items: tableItems,
            cls: 'tableCls'
        });
    },

    createTableItems: function () {
        var items = [];

        var me = this;

        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 9; j++) {
                if (i === 0) {
                    items.push({
                        html: COLUMN_TITLES[j]
                    });
                } else if (j === 0) {
                    items.push({
                        html: ROW_TITLES[i]
                    });
                } else {
                    items.push({
                        html: 'Zero'
                    });
                }
            }
        }

        return items;
    },

    createTeamFeatureStore: function (teamObject) {
        var me = this;
        
        var currentlySelectedRelease = me._getReferenceToCurrentlySelectedRelease();
        var featureFilterByReleaseAndTeam = me.createReleaseFilter(currentlySelectedRelease).and(me.createTeamFilter(teamObject));

        return Ext.create('Rally.data.wsapi.Store', {
            autoLoad: true,
            model: MODELS.FEATURE,
            storeId: teamObject.data.ObjectID,
            context: {
                project: me.getContext.getProject,
                scope: me
            },
            listeners: {
                load: me.launchTeamFeatureSnapshotStores,
                scope: me
            },
            filters: featureFilterByReleaseAndTeam
        });
    },

    createTeamFeatureSnapshotStore: function (featureObject, teamObjectId) {
        var me = this;

        var findSettings = {
            '_TypeHierarchy': MODELS.FEATURE,
            'Project': teamObjectId,
            'ObjectID': featureObject.ObjectID
        };

        window.console.log("What is teamObjectId?", teamObjectId);
        window.console.log("What is featureObject.FormattedID?", featureObject.FormattedID);

        return Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            find: findSettings,
            storeId: teamObjectId,
            fetch: ['FormattedID', 'Name', 'Release', 'State'],
            hydrate: ['FormattedID', 'Project', 'Release', 'State'],
            listeners: {
                load: me.analyzeFeature,
                scope: me
            },
            sorters: [
                {
                    property: 'ObjectID',
                    direction: 'ASC'
                }
            ]
        });
    },
    
    createTeamFilter: function (teamObject) {
        return Ext.create('Rally.data.wsapi.Filter', {
            property: 'Project.Name',
            operation: '=',
            value: teamObject.data.Name
        });
    },

    createReleaseFilter: function (currentlySelectedRelease) {
        var me = this;

        return Ext.create('Rally.data.wsapi.Filter', {
            property: 'Release.Name',
            operation: '=',
            value: currentlySelectedRelease
        });
    },

    _getReferenceToCurrentlySelectedRelease: function () {
        var me = this;

        return me.down(RELEASE_COMBO_BOX_ID_AS_QUERY).getRecord().get('_refObjectName');
    },

    _getCurrentlySelectedReleaseStartDate: function () {
        var me = this;

        return me.down(RELEASE_COMBO_BOX_ID_AS_QUERY).getRecord().raw.ReleaseStartDate;
    },

    _getCurrentlySelectedReleaseEndDate: function () {
        var me = this;

        return me.down(RELEASE_COMBO_BOX_ID_AS_QUERY).getRecord().raw.ReleaseDate;
    }
});
