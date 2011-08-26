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
			'<div style="float: right; width: 100px;">'+
			'<input type="radio" name="dateType" value="date" id="type_date" checked="checked"/><label for="type_date">Date</label><br/>'+
			'<input type="radio" name="dateType" value="range" id="type_range"/><label for="type_range">Date Range</label>'+
			'</div>'+
			'<div id="date">'+
			'<label for="datePicker">Date</label><input type="text" id="datePicker" />'+
			'</div>'+
			'<div id="range">'+
			'<label for="startDate">Start Date</label><input type="text" id="startDate" style="margin-bottom: 5px;"/><br />'+
		    '<label for="endDate">End Date</label><input type="text" id="endDate" />'+
		    '</div>'+
		    '<p>Format: yyyy or yyyy-mm-dd<br/>e.g. 2010, 2010-10-05</p>'+
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
	$(searchInput).bind('keyup', function() {
		doQuery();
	});
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
	
	$('input[name="dateType"]').change(function() {
		var type = this.id.split('_')[1];
		toggleDate(type);
	});
	
	var date = $('#dateDialog');
	date.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#dateDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 200,
		width: 375,
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
	
	$('#dateDialog input').keyup(function(event) {
		if (event.keyCode == '13') {
			event.preventDefault();
			dateResult();
		}
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
		buttonImageOnly: true
	});
	
	var startDate = $('#startDate')[0];
	$(startDate).focus(function() {
		$(this).css({borderBottom: ''});
	});
	var endDate = $('#endDate')[0];
	$(endDate).focus(function() {
		$(this).css({borderBottom: ''});
	});
	
	var dateRange = $('#startDate, #endDate').datepicker({
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
		onSelect: function(selectedDate) {
			var option = this.id == "startDate" ? "minDate" : "maxDate";
			var instance = $(this).data("datepicker");
			var date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);
			dateRange.not(this).datepicker("option", option, date);
		}
	});
	
	var doQuery = function(event) {
		resultsDiv.css({borderColor: '#fff'});
		
		$('#results ul').first().html('<li class="unselectable last"><span>Searching...</span></li>');
		
		var query = searchInput.value;
		
		if (currentType == 'person') {
			$.ajax({
				url: 'http://cwrctc.artsrn.ualberta.ca/solr-'+w.project+'/people/select/',
				data: {
					q: query,
					wt: 'json'
				},
				dataType: 'json',
				success: handleResults,
				error: function() {
					$('#results ul').first().html('<li class="unselectable last"><span>Server error.</span></li>');
				}
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
		
		if (results.length == 0) {
			$('#results ul').first().html('<li class="unselectable last"><span>No results.</span></li>');
		} else {
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
		}
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
	
	var toggleDate = function(type) {
		if (type == 'date') {
			$('#date').show();
			$('#range').hide();
		} else {
			$('#date').hide();
			$('#range').show();
		}
	};
	
	var dateResult = function(cancelled) {
		var data = {};
		if (!cancelled) {
			var type = $('input[name="dateType"]:checked', date).val();
			if (type == 'date') {
				var dateString = dateInput.value;
				if (dateString.match(/^\d{4}-\d{2}-\d{2}$/) || dateString.match(/^\d{4}$/)) {
					data.date = dateString;
				} else {
					$(dateInput).css({borderBottom: '1px solid red'});
					return false;
				}
			} else {
				var startString = startDate.value;
				var endString = endDate.value;
				var error = false;
				var padStart = '';
				var padEnd = '';
				
				if (startString.match(/^\d{4}-\d{2}-\d{2}$/)) {
					data.startDate = startString;
				} else if (startString.match(/^\d{4}$/)) {
					data.startDate = startString;
					padStart = '-01-01';
				} else {
					$(startDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				if (endString.match(/^\d{4}-\d{2}-\d{2}$/)) {
					data.endDate = endString;
				} else if (endString.match(/^\d{4}$/)) {
					data.endDate = endString;
					padEnd = '-01-01';
				} else {
					$(endDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				var start = $.datepicker.parseDate('yy-mm-dd', startString+padStart);
				var end = $.datepicker.parseDate('yy-mm-dd', endString+padEnd);
				
				if (start > end) {
					$(startDate).css({borderBottom: '1px solid red'});
					$(endDate).css({borderBottom: '1px solid red'});
					error = true;
				}
				
				if (error) return false;
			}
		} else {
			data = null;
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
			
			toggleDate('date');
			
			$('#type_date').attr('checked', true);
			
			dateInput.value = '';
			$(dateInput).css({borderBottom: ''});
			startDate.value = '';
			$(startDate).css({borderBottom: ''});
			endDate.value = '';
			$(endDate).css({borderBottom: ''});
			
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