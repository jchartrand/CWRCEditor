var DialogManager = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var dialogs = {
		message: new MessageDialog(config),
		search: new SearchDialog(config),
		note: new NoteDialog(config),
		title: new TitleDialog(config),
		date: new DateDialog(config),
		addPerson: new AddPersonDialog(config)
	};
	
	dialogs.person = dialogs.search;
	dialogs.place = dialogs.search;
	dialogs.event = dialogs.search;
	dialogs.org = dialogs.search;
	
	dialogs.citation = dialogs.note;
	
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
		hideAll: function() {
			for (var key in dialogs) {
				dialogs[key].hide();
			}
		}
	};
};