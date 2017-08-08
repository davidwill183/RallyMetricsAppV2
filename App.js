var Ext = window.Ext4 || window.Ext;

var COMPUTE_METRICS_BUTTON_ID = 'compute-metrics-button';
var NUMBERS_COMBO_BOX_ID = 'numbers-combo-box';
var NUMBERS_COMBO_BOX_ID_AS_QUERY = '#' + NUMBERS_COMBO_BOX_ID;
var NUMBERS_STORE_ID = 'number-store';
var PROJECT_PICKER_ID = 'project-picker';
var RELEASE_COMBO_BOX_ID = 'release-combo-box';
var RELEASE_COMBO_BOX_ID_AS_QUERY = '#' + RELEASE_COMBO_BOX_ID;
var RETRIEVE_RESULTS_BUTTON_ID = 'retrieve-results-button';
var SPRINT_COMBO_BOX_ID = 'sprint-combo-box';
var SPRINT_COMBO_BOX_ID_AS_QUERY = '#' + SPRINT_COMBO_BOX_ID;
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

    },

    onProjectSelect: function (projectPicker) {
        CUBE_TEAMS = projectPicker.selectedValues.items;
    },

    onReleaseSelect: function () {

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

        var featureState = {
            isPlanned: false,
            isCompleted: false,
            isAdded: false,
            isRemoved: false,
            isPartOfRelease: false
        };

        for (var i = 0; i < refFeatureSnapshots.length; i++) {
            featureState.isPartOfRelease = me.determineReleaseStatus(refFeatureSnapshots[i]);
            featureState.isPlanned = me.determinePlannedStatus(refFeatureSnapshots[i], featureState.isPlanned);
            featureState.isCompleted = me.determineCompletedStatus(refFeatureSnapshots[i], featureState.isCompleted);
            featureState.isAdded = me.determineAddedStatus(refFeatureSnapshots[i], featureState.isAdded, featureState.isPlanned);
            featureState.isRemoved = me.determineRemovedStatus(refFeatureSnapshots[i], featureState.isPartOfRelease, featureState.isRemoved);
//            window.console.log("What is the release state of feature: " + refFeatureSnapshots[i].data.FormattedID, featureState.isPartOfRelease);
//            window.console.log("What is the planned state of feature: " + refFeatureSnapshots[i].data.FormattedID, featureState.isPlanned);
//            window.console.log("What is the added state of feature: " + refFeatureSnapshots[i].data.FormattedID, featureState.isAdded);
            window.console.log("What is the removed state of feature: " + refFeatureSnapshots[i].data.FormattedID, featureState.isRemoved);
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
