var DialogManager = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var dialogs = null;
	
	var scripts = ['dialog_addevent.js', 'dialog_addorg.js', 'dialog_addperson.js', 'dialog_addplace.js',
	               'dialog_date.js', 'dialog_message.js', 'dialog_note.js', 'dialog_search.js',
	               'dialog_title.js', 'dialog_triple.js'];
	var loadCount = 0;
	for (var i = 0; i < scripts.length; i++) {
		var url = 'js/dialogs/'+scripts[i];
		$.getScript(url, function(data, status) {
			loadCount++;
			if (loadCount == scripts.length) {
				init();
			}
		});
	}
	
	var init = function() {
		dialogs = {
			message: new MessageDialog(config),
			search: new SearchDialog(config),
			note: new NoteDialog(config),
			title: new TitleDialog(config),
			date: new DateDialog(config),
			addperson: new AddPersonDialog(config),
			addplace: new AddPlaceDialog(config),
			addevent: new AddEventDialog(config),
			addorg: new AddOrganizationDialog(config),
			triple: new TripleDialog(config)
		};
		
		dialogs.person = dialogs.search;
		dialogs.place = dialogs.search;
		dialogs.event = dialogs.search;
		dialogs.org = dialogs.search;
		
		dialogs.citation = dialogs.note;
	};
	
	return {
		getCurrentType: function() {
			return currentType;
		},
		show: function(type, config) {
			if (dialogs[type]) {
				currentType = type;
				dialogs[type].show(config);
			}
		},
		confirm: function(config) {
			currentType = 'message';
			dialogs.message.confirm(config);
		},
		hideAll: function() {
			for (var key in dialogs) {
				dialogs[key].hide();
			}
		}
	};
};