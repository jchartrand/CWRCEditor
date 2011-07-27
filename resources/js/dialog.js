var Dialog = function(config) {
	
	var w = config.writer;
	
	var currentType = null;
	
	$(document.body).append(''+
		'<div id="messageDialog">'+
		    '<p></p>'+
		'</div>'+
		'<div id="searchDialog">'+
		    '<label for="query">Search</label>'+
		    '<input type="text" name="query" />'+
		    '<div id="results"><ul class="searchResults"></ul></div>'+
		'</div>'+
		'<div id="noteDialog">'+
		    '<textarea name="note"></textarea>'+
		'</div>'+
		'<div id="dateDialog">'+
		    '<input type="text" id="datePicker" />'+
		    '<p>Format: yyyy-mm-dd<br/>e.g. 2010-10-05</p>'+
		'</div>'
	);
	
	var message = $('#messageDialog');
	message.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: true,
		height: 250,
		width: 300,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				message.dialog('close');
			}
		}
	});
	
	var search = $('#searchDialog');
	search.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#searchDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 450,
		width: 300,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				searchResult();
			},
			'Cancel': function() {
				searchResult(true);
			}
		}
	});
	var searchInput = $('#searchDialog input')[0];
	$(searchInput).bind('keyup', doQuery);
	var resultsDiv = $('#results');
	
	var note = $('#noteDialog');
	note.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#noteDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 250,
		width: 300,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				noteResult();
			},
			'Cancel': function() {
				noteResult(true);
			}
		}
	});
	var noteInput = $('#noteDialog textarea')[0];
	
	var date = $('#dateDialog');
	date.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#dateDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 250,
		width: 300,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				dateResult();
			},
			'Cancel': function() {
				dateResult(true);
			}
		}
	});
	var dateInput = $('#datePicker')[0];
	$(dateInput).focus(function() {
		$(this).css({borderBottom: ''});
	});
	$('#datePicker').datepicker({
		dateFormat: 'yy-mm-dd',
		constrainInput: false,
		changeMonth: true,
		changeYear: true,
		yearRange: '-210:+10',
		minDate: new Date(1800, 0, 1),
		maxDate: new Date(2020, 11, 31),
		showOn: 'button',
		buttonText: 'Date Picker',
		buttonImage: 'img/calendar.png',
		buttonImageOnly: true,
		onSelect: doDateSelect
	});
	
	var doQuery = function(event) {
		resultsDiv.css({borderColor: '#fff'});
		
		var query = searchInput.value;
		
		if (currentType == 'person') {
			$.ajax({
				url: 'http://cwrctc.artsrn.ualberta.ca/solr-cwrc/people/select/',
				data: {
					q: query,
					wt: 'json'
				},
				dataType: 'json',
				success: handleResults
			});
		} else {
			var data = {
				response: {
					docs: []
				}
			};
			var length = Math.ceil(Math.random()*10);
			for (var i = 0; i < length; i++) {
				var d = {
					date: new Date(Math.round(Math.random()*1000000000000)).toDateString()
				};
				d[currentType] = 'Random '+currentType+' '+i;
				data.response.docs.push(d);
			}
			handleResults(data);
		}
	};
	
	var handleResults = function(data, status, xhr) {
		var formattedResults = '';
		var last = '';
		var results = data.response.docs;
		
		var r, i, j;
		for (i = 0; i < results.length; i++) {
			
			r = results[i];
			
			if (i == results.length - 1) last = 'last';
			else last = '';
			
			formattedResults += '<li class="unselectable '+last+'">';
			for (j in r) {
				formattedResults += '<span>'+r[j]+'</span>';
			}
			formattedResults += '</li>';
		}

		$('#results ul').first().html(formattedResults);
		
		$('#results ul li').each(function(index) {
			$(this).data(results[index]);
		});
		
		$('#results ul li').click(function(event) {
			resultsDiv.css({borderColor: '#fff'});
			var remove = $(this).hasClass('selected');
			$('#results ul li').removeClass('selected');
			if (!remove ) $(this).addClass('selected');
		});
		
		$('#results ul li').dblclick(function(event) {
			$('#results ul li').removeClass('selected');
			$(this).addClass('selected');
			searchResult();
		});
	};
	
	var searchResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			data = $('#results ul li.selected').data();
			if (data) {
				for (var key in data) {
					if (key.match(/jQuery/)) {
						delete data[key];
					}
				}
			} else {
				resultsDiv.css({borderColor: 'red'});
				return false;
			}
		}
		w.finalizeEntity(w.editor.currentEntity, data);
		search.dialog('close');
		currentType = null;
	};
	
	var noteResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			data = {note: noteInput.value};
		}
		w.finalizeEntity(w.editor.currentEntity, data);
		note.dialog('close');
		currentType = null;
	};
	
	var doDateSelect = function(dateText, picker) {
	};
	
	var dateResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var dateString = dateInput.value;
			if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
				data = {date: dateString};
			} else {
				$(dateInput).css({borderBottom: '1px solid red'});
				return false;
			}
		}
		w.finalizeEntity(w.editor.currentEntity, data);
		date.dialog('close');
		currentType = null;
	};
	
	return {
		showMessage: function(config) {
			var title = config.title;
			var msg = config.msg;
			
			message.dialog('option', 'title', title);
			$('#messageDialog > p').html(msg);
			
			message.dialog('open');
		},
		showSearch: function(config) {
			currentType = config.type;
			
			resultsDiv.css({borderColor: '#fff'});
			resultsDiv.children('ul').html('');
			
			if (config.query) {
				searchInput.value = config.query;
				doQuery();
			} else {
				searchInput.value = '';
			}
			
			var title = 'Add '+config.title;
			search.dialog('option', 'title', title);
			if (config.pos) {
				search.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				search.dialog('option', 'position', 'center');
			}
			search.dialog('open');
		},
		showNote: function(config) {
			currentType = config.type;
			
			noteInput.value = '';
			
			var title = 'Add '+config.title;
			note.dialog('option', 'title', title);
			if (config.pos) {
				note.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				note.dialog('option', 'position', 'center');
			}
			note.dialog('open');
		},
		showDate: function(config) {
			currentType = config.type;
			
			dateInput.value = '';
			$(dateInput).css({borderBottom: ''});
			
			var title = 'Add '+config.title;
			date.dialog('option', 'title', title);
			if (config.pos) {
				date.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				date.dialog('option', 'position', 'center');
			}
			date.dialog('open');
		},
		hide: function() {
			message.dialog('close');
			search.dialog('close');
			note.dialog('close');
			date.dialog('close');
		}
	};
};