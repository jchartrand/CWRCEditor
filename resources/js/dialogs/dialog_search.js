var SearchDialog = function(config) {
	var w = config.writer;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="searchDialog">'+
	    '<label for="query">Search</label>'+
	    '<input type="text" name="query" />'+
	    '<div id="results"><ul class="searchResults"></ul></div>'+
	'</div>');
	
	var search = $('#searchDialog');
	search.dialog({
		modal: true,
		resizable: false,
		dialogClass: 'splitButtons',
		closeOnEscape: false,
		open: function(event, ui) {
			$('#searchDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 450,
		width: 325,
		autoOpen: false
	});
	var searchInput = $('#searchDialog input')[0];
	$(searchInput).bind('keyup', function() {
		doQuery();
	});
	var resultsDiv = $('#results');
	
	var doQuery = function(event) {
		resultsDiv.css({borderColor: '#fff'});
		
		$('#results ul').first().html('<li class="unselectable last"><span>Searching...</span></li>');
		
		var query = searchInput.value;
		
		if (currentType == 'person') {
			$.ajax({
				url: w.baseUrl+'editor/solr-'+w.project+'/people/select/',
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
		if (!(mode == EDIT && data == null)) {
			w.finalizeEntity(w.editor.currentEntity, data);
		}
		search.dialog('close');
		currentType = null;
	};
	
	var createNew = function() {
		w.d.show('add'+currentType, {});
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Tag ';
			
			if (mode == EDIT) {
				prefix = 'Edit ';
			}
			
			resultsDiv.css({borderColor: '#fff'});
			resultsDiv.children('ul').html('');
			
			var query = w.entities[w.editor.currentEntity].props.content;
			searchInput.value = query;
			doQuery();
			
			var title = prefix+config.title;
			search.dialog('option', 'title', title);
			search.dialog('option', 'buttons', [{
				text: 'Create New',
				'class': 'left',
				click: function() {
					createNew();
				}
			},{
				text: 'Cancel',
				click: function() {
					searchResult(true);
				}
			},{
				text: 'Tag '+config.title,
				click: function() {
					searchResult();
				}
			}]);
			if (config.pos) {
				search.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				search.dialog('option', 'position', 'center');
			}
			search.dialog('open');
		},
		hide: function() {
			search.dialog('close');
		}
	};
};