var KeywordDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="keywordDialog">'+
		'<div id="keyword_choice">'+
			'<div id="keyword_key">'+
			    '<h3><a href="#">Keyword</a></h3>'+
			    '<div><label for="keyword_input">Keyword</label><input type="text" id="keyword_input" /></div>'+
		    '</div>'+
		    '<div id="keyword_index">'+
			    '<h3><a href="#">Index Term</a></h3>'+
			    '<div><label for="keyword_lookup">OCLC Lookup</label><input type="text" id="keyword_lookup" /><ul></ul></div>'+
			'</div>'+
		'</div>'+
	'</div>');
	
	$('#keyword_choice').accordion({
		header: 'div > h3',
		fillSpace: true
	});
	
	var keyword = $('#keywordDialog');
	keyword.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#keywordDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 350,
		width: 400,
		autoOpen: false,
		buttons: {
			'Tag Keyword': function() {
				keywordResult();
			},
			'Cancel': function() {
				keywordResult(true);
			}
		}
	});
	
	$('#keyword_lookup').keyup(function() {
		var query = $(this).val();
		$.ajax({
			url: 'http://tspilot.oclc.org/lcsh/',
			data: {
				query: query,
				version: '1.1',
				operation: 'searchRetrieve',
				recordSchema: 'http%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore',
				maximumRecords: '10',
				startRecord: '1'
			},
			success: function(data, status, xhr) {
				
			},
			error: function(xhr, status, error) {
				
			}
		});
	});
	
	var keywordResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var data = {
				
			};
		}
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		keyword.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			if (mode == ADD) {
				
			} else {
				prefix = 'Edit ';
			}
			
			var title = prefix+config.title;
			keyword.dialog('option', 'title', title);
			if (config.pos) {
				keyword.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				keyword.dialog('option', 'position', 'center');
			}
			keyword.dialog('open');
		},
		hide: function() {
			keyword.dialog('close');
		}
	};
};