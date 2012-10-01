var DialogManager = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var dialogs = {
		message: new MessageDialog(config),
		search: new SearchDialog(config),
		note: new NoteDialog(config),
		citation: new CitationDialog(config),
		correction: new CorrectionDialog(config),
		keyword: new KeywordDialog(config),
		title: new TitleDialog(config),
		date: new DateDialog(config),
		link: new LinkDialog(config),
		addperson: new AddPersonDialog(config),
		addplace: new AddPlaceDialog(config),
		addevent: new AddEventDialog(config),
		addorg: new AddOrganizationDialog(config),
		triple: new TripleDialog(config),
		header: new HeaderDialog(config)
	};
	
	dialogs.person = dialogs.search;
	dialogs.place = dialogs.search;
	dialogs.event = dialogs.search;
	dialogs.org = dialogs.search;
	
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