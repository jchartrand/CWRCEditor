var Dialog = function(config) {
	
	var dialogEvents = null;
	
	var message = null;
	
	var search = null;
	var searchInput = null;
	var results = null;
	
	var note = null;
	var noteInput = null;
	
	var date = null;
	var dateInput = null;
	
	var currentType = null;
	
	var doQuery = function(event) {
		results.css({borderColor: '#fff'});
		
		var query = searchInput.value;
		
		if (query == '') {
			results.hide();
		} else {
			results.show();
		}
		
		// TODO add solr query
		var data = [];
		var length = Math.ceil(Math.random()*10);
		for (var i = 0; i < length; i++) {
			var d = {
				date: new Date(Math.round(Math.random()*1000000000000)).toDateString()
			};
			d[currentType] = 'Random '+currentType+' '+i;
			data.push(d);
		}
		handleResults(data);
	};
	
	var handleResults = function(data) {
		var formattedResults = '';
		var last = '';
		for (var i = 0; i < data.length; i++) {
			
			var r = data[i];
			
			if (i == data.length - 1) last = 'last';
			else last = '';
			
			formattedResults += ''+ 
			'<li class="unselectable '+last+'">'+
				'<span>'+r[currentType]+'</span>'+
				'<span>'+r.date+'</span>'+
			'</li>';
		}

		$('#results ul').first().html(formattedResults);
		
		$('#results ul li').each(function(index) {
			$(this).data(data[index]);
		});
		
		$('#results ul li').click(function(event) {
			results.css({borderColor: '#fff'});
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
				results.css({borderColor: 'red'});
				return false;
			}
		}
		dialogEvents.trigger('searchResult', [currentType, data]);
		search.dialog('close');
		currentType = null;
	};
	
	var noteResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			data = {note: noteInput.value};
		}
		dialogEvents.trigger('noteResult', [currentType, data]);
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
		dialogEvents.trigger('dateResult', [currentType, data]);
		date.dialog('close');
		currentType = null;
	};
	
	return {
		init: function() {
			$(document.body).append(''+
				'<div id="messageDialog">'+
				    '<p></p>'+
				'</div>'+
				'<div id="searchDialog">'+
				    '<label for="query">Search</label>'+
				    '<input type="text" name="query" />'+
				    '<div id="results"><ul></ul></div>'+
				'</div>'+
				'<div id="noteDialog">'+
				    '<textarea name="note"></textarea>'+
				'</div>'+
				'<div id="dateDialog">'+
				    '<input type="text" id="datePicker" />'+
				    '<p>Format: yyyy-mm-dd<br/>e.g. 2010-10-05</p>'+
				'</div>'+
				'<div id="dialogEvents" />'
			);
			
			dialogEvents = $('#dialogEvents');
			
			message = $('#messageDialog');
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
			
			search = $('#searchDialog');
			search.dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) { $('#searchDialog .ui-dialog-titlebar-close').hide(); },
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
			searchInput = $('#searchDialog input')[0];
			$(searchInput).bind('keyup', doQuery);
			results = $('#results');
			
			note = $('#noteDialog');
			note.dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) { $('#noteDialog .ui-dialog-titlebar-close').hide(); },
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
			noteInput = $('#noteDialog textarea')[0];
			
			date = $('#dateDialog');
			date.dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) { $('#dateDialog .ui-dialog-titlebar-close').hide(); },
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
			dateInput = $('#datePicker')[0];
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
		},
		showMessage: function(config) {
			var title = config.title;
			var msg = config.msg;
			
			message.dialog('option', 'title', title);
			$('#messageDialog > p').html(msg);
			
			message.dialog('open');
		},
		showSearch: function(config) {
			currentType = config.type;
			
			results.css({borderColor: '#fff'});
			
			if (config.query) {
				searchInput.value = config.query;
				doQuery();
			} else {
				searchInput.value = '';
				results.hide();
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